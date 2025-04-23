package ws

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var rooms = make(map[string]map[*websocket.Conn]bool)
var mu sync.Mutex

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins (you can modify for production)
	},
}

func HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Error upgrading connection:", err)
		return
	}
	defer conn.Close()

	// Define variables for room and username
	var currentRoom, username string
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			// If an error occurs (like client disconnect), break the loop
			fmt.Println("Error reading message:", err)
			break
		}

		// Parse the incoming message
		var message Message
		err = json.Unmarshal(msg, &message)
		if err != nil {
			fmt.Println("Error unmarshalling message:", err)
			continue
		}

		// Handle the join message type
		if message.Type == "join" {
			username = message.Username
			currentRoom = message.RoomID

			// Add the user to the room
			joinRoom(currentRoom, conn)

			// Notify everyone in the room that a new user has joined
			broadcastMessage(currentRoom, Message{
				Type:     "user-joined",
				Username: username,
				Message:  fmt.Sprintf("%s joined the room", username),
			})

			oldMessages, err := GetMessages(currentRoom)
			if err == nil {
				for _, msg := range oldMessages {
					conn.WriteJSON(msg)
				}
			}
		} else if message.Type == "chat" {
			message.Timestamp = time.Now().Unix()
			message.RoomID = currentRoom
			SaveMessage(currentRoom, message)
			broadcastMessage(currentRoom, message)
		}
	}

	// Cleanup: Remove the client from the room when they disconnect
	mu.Lock()
	if _, exists := rooms[currentRoom]; exists {
		delete(rooms[currentRoom], conn)
	}
	mu.Unlock()
}

// Add user to a room
func joinRoom(roomID string, conn *websocket.Conn) {
	mu.Lock()
	defer mu.Unlock()

	if rooms[roomID] == nil {
		rooms[roomID] = make(map[*websocket.Conn]bool)
	}
	rooms[roomID][conn] = true
}

// Broadcast a message to all users in a room
func broadcastMessage(roomID string, message Message) {
	mu.Lock()
	defer mu.Unlock()

	// Ensure the room exists before broadcasting
	if roomClients, exists := rooms[roomID]; exists {
		// Marshal the message to JSON
		msgBytes, err := json.Marshal(message)
		if err != nil {
			fmt.Println("Error marshalling message:", err)
			return
		}

		// Send the message to all clients in the room
		for client := range roomClients {
			err := client.WriteMessage(websocket.TextMessage, msgBytes)
			if err != nil {
				fmt.Println("Error sending message to client:", err)
				client.Close()
				delete(roomClients, client)
			}
		}
	}
}
