package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

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
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get username from context or query (in a real app, get from DB or session)
	username, _ := c.Get("username")
	usernameStr, ok := username.(string)
	if !ok {
		usernameStr = fmt.Sprintf("user_%d", userID.(int))
	}

	// Get room ID from URL
	roomIDStr := c.Param("id")
	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
		return
	}

	// TODO: Check if user has access to this room
	// This would call your room repository to verify permissions

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Create room connection
	roomConn := &RoomConnection{
		UserID:   userID.(int),
		Username: usernameStr,
		RoomID:   roomID,
		Conn:     conn,
		Send:     make(chan []byte, 256),
	}

	// Start goroutines for reading and writing
	go roomConn.readPump()
	go roomConn.writePump()

	// Subscribe to room events
	go roomConn.subscribeToRoomEvents()

	// Announce user joined
	roomConn.announceUserJoined()
}

// readPump reads messages from the client WebSocket
func (rc *RoomConnection) readPump() {
	defer func() {
		rc.announceUserLeft()
		rc.Conn.Close()
	}()

	// Set read parameters
	rc.Conn.SetReadLimit(4096)
	rc.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	rc.Conn.SetPongHandler(func(string) error {
		rc.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// Read messages
	for {
		_, message, err := rc.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse message
		var event RoomEvent
		if err := json.Unmarshal(message, &event); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		// Set user info
		event.UserID = rc.UserID
		event.Username = rc.Username
		event.Timestamp = time.Now().Unix()

		// Process based on event type
		switch event.Type {
		case "chat_message":
			// Publish to Redis
			rc.publishRoomEvent(event)

		case "playback_update":
			// Publish to Redis
			rc.publishRoomEvent(event)

		case "ping":
			// Just respond with pong directly
			rc.Send <- []byte(`{"type":"pong","timestamp":` + fmt.Sprintf("%d", time.Now().Unix()) + `}`)

		default:
			// Unknown event type, could log or handle
		}
	}
}

// writePump sends messages to the client WebSocket
func (rc *RoomConnection) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		rc.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-rc.Send:
			rc.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Channel closed
				rc.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := rc.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages
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
		}
	}
}

// subscribeToRoomEvents subscribes to Redis channel for room events
func (rc *RoomConnection) subscribeToRoomEvents() {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	roomChannel := fmt.Sprintf("room:%d:events", rc.RoomID)
	pubsub := redisClient.Subscribe(context.Background(), roomChannel)
	defer pubsub.Close()

	// Process messages from Redis
	for {
		msg, err := pubsub.ReceiveMessage(context.Background())
		if err != nil {
			log.Printf("Error receiving message: %v", err)
			break
		}

		// Forward to client
		select {
		case rc.Send <- []byte(msg.Payload):
		default:
			log.Printf("Send buffer full, dropping message")
		}
	}
}

// publishRoomEvent publishes an event to the room's Redis channel
func (rc *RoomConnection) publishRoomEvent(event RoomEvent) {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	// Serialize event
	eventJSON, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error serializing event: %v", err)
		return
	}

	// Publish to Redis
	roomChannel := fmt.Sprintf("room:%d:events", rc.RoomID)
	if err := redisClient.Publish(context.Background(), roomChannel, eventJSON).Err(); err != nil {
		log.Printf("Error publishing event: %v", err)
	}
}

// announceUserJoined sends a message when a user joins the room
func (rc *RoomConnection) announceUserJoined() {
	event := RoomEvent{
		Type:      "user_joined",
		UserID:    rc.UserID,
		Username:  rc.Username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  rc.UserID,
			"username": rc.Username,
		},
	}
	rc.publishRoomEvent(event)
}

// announceUserLeft sends a message when a user leaves the room
func (rc *RoomConnection) announceUserLeft() {
	event := RoomEvent{
		Type:      "user_left",
		UserID:    rc.UserID,
		Username:  rc.Username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  rc.UserID,
			"username": rc.Username,
		},
	}
	rc.publishRoomEvent(event)
}
