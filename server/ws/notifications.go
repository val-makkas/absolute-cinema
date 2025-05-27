package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type NotificationConnection struct {
	UserID int
	Conn   *websocket.Conn
	Send   chan []byte
}

type NotificationEvent struct {
	Type      string         `json:"type"`
	UserID    int            `json:"user_id"`
	Timestamp int64          `json:"timestamp"`
	Data      map[string]any `json:"data,omitempty"`
}

func HandleNotificationsWS(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
		return
	}
	defer conn.Close()

	// Create a new notification connection
	notificationConn := &NotificationConnection{
		UserID: userID.(int),
		Conn:   conn,
		Send:   make(chan []byte),
	}

	go notificationConn.readPump()
	go notificationConn.writePump()
	go notificationConn.subscribeToNotifications()

	log.Printf("User %d connected to notifications WebSocket", userID.(int))
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

			n := len(nc.Send)
			for range n {
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

func SendRoomInviteNotification(toUserID, fromUserID int, fromUsername string, roomID int, roomName string) error {
	return SendNotification(toUserID, "room_invite", map[string]interface{}{
		"from_user_id":  fromUserID,
		"from_username": fromUsername,
		"room_id":       roomID,
		"room_name":     roomName,
		"message":       fmt.Sprintf("%s invited you to join room '%s'", fromUsername, roomName),
	})
}
