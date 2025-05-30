package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"zync-stream/middleware"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type NotificationConnection struct {
	UserID int
	Conn   *websocket.Conn
	Send   chan []byte
	done   chan struct{}
}

type NotificationEvent struct {
	Type      string         `json:"type"`
	UserID    int            `json:"user_id"`
	Timestamp int64          `json:"timestamp"`
	Data      map[string]any `json:"data,omitempty"`
}

func HandleNotificationsWS(c *gin.Context) {
	// Allow connection without immediate auth check
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("New WebSocket connection established, waiting for auth...")

	// Set timeout for authentication (10 seconds)
	conn.SetReadDeadline(time.Now().Add(10 * time.Second))

	// Wait for authentication message
	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("Failed to read auth message: %v", err)
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "Authentication timeout or failed to read auth message",
		})
		return
	}
	var authMsg struct {
		Type  string `json:"type"`
		Token string `json:"token"`
	}

	if err := json.Unmarshal(message, &authMsg); err != nil {
		log.Printf("Failed to parse auth message: %v", err)
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "Invalid auth message format",
		})
		return
	}

	// Validate auth message
	if authMsg.Type != "auth" || authMsg.Token == "" {
		log.Printf("Invalid auth message type or missing token")
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "Auth message must have type 'auth' and include token",
		})
		return
	}

	log.Printf("Received auth message, validating token...")

	// Validate JWT token
	claims, err := middleware.ValidateJWT(authMsg.Token)
	if err != nil {
		log.Printf("JWT validation failed: %v", err)
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "Invalid or expired token",
		})
		return
	}

	// Extract user ID from claims
	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		log.Printf("Invalid user_id in JWT claims")
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "Invalid user ID in token",
		})
		return
	}
	userID := int(userIDFloat)

	log.Printf("Authentication successful for user %d", userID)

	// Send auth success response
	conn.WriteJSON(map[string]string{
		"type":    "auth_success",
		"message": "Authentication successful",
	})

	// Remove read deadline after successful auth
	conn.SetReadDeadline(time.Time{})

	// Create notification connection
	notifConn := &NotificationConnection{
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		done:   make(chan struct{}),
	}

	// Start connection handlers
	go notifConn.writePump()
	go notifConn.subscribeToNotifications()

	log.Printf("User %d connected to notifications WebSocket", userID)

	// Handle incoming messages (keep-alive, etc.)
	notifConn.readPump()
}

func (nc *NotificationConnection) readPump() {
	defer nc.Conn.Close()

	nc.Conn.SetReadLimit(512)
	nc.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	nc.Conn.SetPongHandler(func(string) error {
		nc.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := nc.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

func (nc *NotificationConnection) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		nc.Conn.Close()
		log.Printf("User %d disconnected from notifications", nc.UserID)
	}()

	for {
		select {
		case message, ok := <-nc.Send:
			nc.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				nc.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := nc.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Fixed: proper loop for buffered messages
			n := len(nc.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-nc.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			nc.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := nc.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (nc *NotificationConnection) subscribeToNotifications() {
	nc.sendConnectionEstablishedEvent()

	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	notificationChannel := fmt.Sprintf("user:%d:notifications", nc.UserID)
	pubsub := redisClient.Subscribe(context.Background(), notificationChannel)
	defer pubsub.Close()

	log.Printf("User %d subscribed to notifications channel: %s", nc.UserID, notificationChannel)

	for {
		msg, err := pubsub.ReceiveMessage(context.Background())
		if err != nil {
			log.Printf("Error receiving notification: %v", err)
			break
		}

		select {
		case nc.Send <- []byte(msg.Payload):
		default:
			log.Printf("Notification buffer full for user %d, dropping message", nc.UserID)
		}
	}
}

func (nc *NotificationConnection) sendConnectionEstablishedEvent() {
	connectionEvent := NotificationEvent{
		Type:      "connection_established",
		UserID:    nc.UserID,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"message": "WebSocket connection established",
		},
	}

	eventJSON, err := json.Marshal(connectionEvent)
	if err != nil {
		log.Printf("Error marshaling connection event: %v", err)
		return
	}

	select {
	case nc.Send <- eventJSON:
		log.Printf("Sent connection established event to user %d", nc.UserID)
	default:
		log.Printf("Could not send connection event to user %d - buffer full", nc.UserID)
	}
}

func SendNotification(userID int, notificationType string, data map[string]interface{}) error {
	redisClient, err := GetRedisClient()
	if err != nil {
		return err
	}

	notification := NotificationEvent{
		Type:      notificationType,
		UserID:    userID,
		Timestamp: time.Now().Unix(),
		Data:      data,
	}

	notificationJSON, err := json.Marshal(notification)
	if err != nil {
		return err
	}

	notificationChannel := fmt.Sprintf("user:%d:notifications", userID)
	err = redisClient.Publish(context.Background(), notificationChannel, notificationJSON).Err()
	if err != nil {
		log.Printf("Failed to send notification to user %d: %v", userID, err)
		return err
	}

	log.Printf("Sent %s notification to user %d", notificationType, userID)
	return nil
}

// Helper functions for different notification types
func SendFriendRequestNotification(toUserID, fromUserID int, fromUsername, fromDisplayName string) error {
	return SendNotification(toUserID, "friend_request_received", map[string]interface{}{
		"id":                  fromUserID,
		"sender_id":           fromUserID,
		"username":            fromUsername,
		"display_name":        fromDisplayName,
		"profile_picture_url": nil,
		"created_at":          time.Now().Format(time.RFC3339),
	})
}

func SendFriendRequestAcceptedNotification(toUserID, fromUserID int, fromUsername, fromDisplayName string) error {
	return SendNotification(toUserID, "friend_request_accepted", map[string]interface{}{
		"user_id":      fromUserID,
		"username":     fromUsername,
		"display_name": fromDisplayName,
	})
}

func SendFriendRequestRejectedNotification(toUserID, fromUserID int, fromUsername, fromDisplayName string) error {
	return SendNotification(toUserID, "friend_request_rejected", map[string]interface{}{
		"user_id":      fromUserID,
		"username":     fromUsername,
		"display_name": fromDisplayName,
	})
}

func SendRoomInviteNotification(toUserID, fromUserID int, fromUsername string, roomID int, roomName string) error {
	return SendNotification(toUserID, "room_invitation", map[string]interface{}{
		"from_user_id":  fromUserID,
		"from_username": fromUsername,
		"inviter_name":  fromUsername,
		"room_id":       roomID,
		"room_name":     roomName,
		"message":       fmt.Sprintf("%s invited you to join room: %s", fromUsername, roomName),
	})
}

func SendRoomInviteAcceptedNotification(toUserID, fromUserID int, fromUsername string, roomID int, roomName string) error {
	return SendNotification(toUserID, "invitation_accepted", map[string]interface{}{
		"responder_id":   fromUserID,
		"responder_name": fromUsername,
		"room_id":        roomID,
		"room_name":      roomName,
		"message":        fmt.Sprintf("%s accepted your invitation to room: %s", fromUsername, roomName),
	})
}

func SendRoomInviteRejectedNotification(toUserID, fromUserID int, fromUsername string, roomID int, roomName string) error {
	return SendNotification(toUserID, "invitation_rejected", map[string]interface{}{
		"responder_id":   fromUserID,
		"responder_name": fromUsername,
		"room_id":        roomID,
		"room_name":      roomName,
		"message":        fmt.Sprintf("%s declined your invitation to room: %s", fromUsername, roomName),
	})
}
