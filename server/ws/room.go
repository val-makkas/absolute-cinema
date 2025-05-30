package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"zync-stream/middleware"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// RoomConnection manages a WebSocket connection for a specific room
type RoomConnection struct {
	UserID   int
	Username string
	RoomID   int
	Conn     *websocket.Conn
	Send     chan []byte
	done     chan struct{}
}

// RoomEvent represents an event within a room
type RoomEvent struct {
	Type      string                 `json:"type"`
	UserID    int                    `json:"user_id"`
	Username  string                 `json:"username,omitempty"`
	Timestamp int64                  `json:"timestamp"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// HandleRoomWebSocket handles WebSocket connections for a specific room
func HandleRoomWebSocket(c *gin.Context) {
	// Get and validate token from query parameter
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
		return
	}

	claims, err := middleware.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	// Extract user info from JWT claims
	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
		return
	}
	userID := int(userIDFloat)

	username, ok := claims["username"].(string)
	if !ok {
		username = fmt.Sprintf("user_%d", userID)
	}

	// Get room ID from URL
	roomIDStr := c.Param("id")
	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
		return
	}

	// Check if user has access to this room
	log.Printf("User %d (%s) connecting to room %d (no access check)", userID, username, roomID)

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// Create room connection
	roomConn := &RoomConnection{
		UserID:   userID,
		Username: username,
		RoomID:   roomID,
		Conn:     conn,
		Send:     make(chan []byte, 256),
	}

	go roomConn.readPump()
	go roomConn.writePump()
	go roomConn.subscribeToRoomEvents()

	roomConn.announceUserJoined()

	log.Printf("User %d (%s) connected to room %d WebSocket", userID, username, roomID)

	<-roomConn.done
	log.Printf("User %d (%s) WebSocket connection closed for room %d", userID, username, roomID)
}

// checkRoomAccess verifies if a user has access to a room
func checkRoomAccess(ctx context.Context, roomID, userID int) (bool, error) {

	// For now, allow access to all users
	// In a real implementation, you would:
	// 1. Check if room is public
	// 2. Check if user is a member of private rooms
	// 3. Query your database to verify permissions

	// Simple check - you can implement more complex logic
	// This is a placeholder - replace with actual room permission logic

	// Example query (you'd need to implement this with your database):
	// SELECT COUNT(*) FROM room_members WHERE room_id = $1 AND user_id = $2
	// OR
	// SELECT is_private FROM rooms WHERE id = $1 AND (is_private = false OR owner_id = $2)

	log.Printf("Checking room access for user %d to room %d", userID, roomID)

	// For development, allow all access
	// TODO: Implement proper room access control
	return true, nil
}

// Rest of your existing methods stay the same...
func (rc *RoomConnection) readPump() {
	defer func() {
		rc.announceUserLeft()
		rc.Conn.Close()
	}()

	rc.Conn.SetReadLimit(4096)
	rc.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	rc.Conn.SetPongHandler(func(string) error {
		rc.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := rc.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var event RoomEvent
		if err := json.Unmarshal(message, &event); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		event.UserID = rc.UserID
		event.Username = rc.Username
		event.Timestamp = time.Now().Unix()

		switch event.Type {
		case "chat_message":
			rc.publishRoomEvent(event)
		case "playback_update":
			rc.publishRoomEvent(event)
		case "ping":
			rc.Send <- []byte(`{"type":"pong","timestamp":` + fmt.Sprintf("%d", time.Now().Unix()) + `}`)
		default:
			log.Printf("Unknown event type: %s", event.Type)
		}
	}
}

func (rc *RoomConnection) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		rc.Conn.Close()
		log.Printf("User %d (%s) disconnected from room %d", rc.UserID, rc.Username, rc.RoomID)
	}()

	for {
		select {
		case message, ok := <-rc.Send:
			rc.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				rc.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := rc.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Check for additional messages in the queue
			n := len(rc.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-rc.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			rc.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := rc.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-rc.done:
			return
		}
	}
}

func (rc *RoomConnection) subscribeToRoomEvents() {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	roomChannel := fmt.Sprintf("room:%d:events", rc.RoomID)
	pubsub := redisClient.Subscribe(context.Background(), roomChannel)
	defer pubsub.Close()

	log.Printf("User %d subscribed to room %d events", rc.UserID, rc.RoomID)

	for {
		select {
		case <-rc.done:
			return
		default:
			msg, err := pubsub.ReceiveMessage(context.Background())
			if err != nil {
				log.Printf("Error receiving message: %v", err)
				return
			}

			select {
			case rc.Send <- []byte(msg.Payload):
			case <-rc.done:
				return
			default:
				log.Printf("Send buffer full for user %d in room %d, dropping message", rc.UserID, rc.RoomID)
			}
		}
	}
}

func (rc *RoomConnection) publishRoomEvent(event RoomEvent) {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error serializing event: %v", err)
		return
	}

	roomChannel := fmt.Sprintf("room:%d:events", rc.RoomID)
	if err := redisClient.Publish(context.Background(), roomChannel, eventJSON).Err(); err != nil {
		log.Printf("Error publishing event: %v", err)
	} else {
		log.Printf("Published %s event to room %d by user %d", event.Type, rc.RoomID, rc.UserID)
	}
}

func (rc *RoomConnection) announceUserJoined() {
	event := RoomEvent{
		Type:      "user_joined",
		UserID:    rc.UserID,
		Username:  rc.Username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  rc.UserID,
			"username": rc.Username,
			"message":  fmt.Sprintf("%s joined the room", rc.Username),
		},
	}
	rc.publishRoomEvent(event)
}

func (rc *RoomConnection) announceUserLeft() {
	event := RoomEvent{
		Type:      "user_left",
		UserID:    rc.UserID,
		Username:  rc.Username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  rc.UserID,
			"username": rc.Username,
			"message":  fmt.Sprintf("%s left the room", rc.Username),
		},
	}
	rc.publishRoomEvent(event)
}
