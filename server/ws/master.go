package ws

import (
	"encoding/json"
	"fmt"
	"log"
	"time"
	"zync-stream/middleware"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type MasterMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

type MasterConn struct {
	UserID              int
	Username            string
	Conn                *websocket.Conn
	Send                chan []byte
	done                chan struct{}
	notificationHandler *NotificationHandler
	roomHandler         *RoomHandler
}

func HandleMasterWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection %s", err)
		return
	}
	defer conn.Close()

	conn.SetReadDeadline(time.Now().Add(10 * time.Second))

	_, message, err := conn.ReadMessage()
	if err != nil {
		log.Printf("Failed to read auth message %s", err)
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "Authentication failed.",
		})
		return
	}

	var authMsg struct {
		Type  string `json:"type"`
		Token string `json:"token"`
	}

	if err := json.Unmarshal(message, &authMsg); err != nil {
		log.Printf("Failed to parse auth message")
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "failed to parse authmsg check input",
		})
		return
	}

	claims, err := middleware.ValidateJWT(authMsg.Token)
	if err != nil {
		log.Printf("Invalid token")
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "Invalid token",
		})
		return
	}

	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		log.Printf("Invalid user ID")
		conn.WriteJSON(map[string]string{
			"type":    "auth_error",
			"message": "Invalid user ID",
		})
		return
	}

	userID := int(userIDFloat)

	username, ok := claims["username"].(string)
	if !ok {
		username = fmt.Sprintf("user_%d", userID)
	}

	conn.WriteJSON(map[string]string{
		"type":    "auth_success",
		"message": "Auth success",
	})

	conn.SetReadDeadline(time.Time{})

	masterConn := &MasterConn{
		UserID:   userID,
		Username: username,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		done:     make(chan struct{}),
	}

	masterConn.notificationHandler = NewNotificationHandler(userID, username, masterConn.Send, masterConn.done)
	masterConn.roomHandler = NewRoomHandler(userID, username, masterConn.Send, masterConn.done)

	if presenceManager := GetPresenceManager(); presenceManager != nil {
		notifConn := &NotificationConnection{
			UserID: userID,
			Conn:   conn,
			Send:   masterConn.Send,
			done:   masterConn.done,
		}
		presenceManager.AddConnection(userID, username, notifConn)
	}

	go masterConn.writePump()
	go masterConn.sendConnectionEstablished()

	masterConn.notificationHandler.Subscribe()
	masterConn.roomHandler.Subscribe()

	defer func() {
		if presenceManager := GetPresenceManager(); presenceManager != nil {
			presenceManager.RemoveConnection(userID)
		}
		masterConn.roomHandler.Cleanup()
	}()

	masterConn.readPump()
}

func (mc *MasterConn) readPump() {
	defer func() {
		close(mc.done)
		mc.Conn.Close()
	}()

	mc.Conn.SetReadLimit(4096)
	mc.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	mc.Conn.SetPongHandler(func(string) error {
		mc.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := mc.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Websocket error: %s", err)
			}
			break
		}

		var msg MasterMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error parsing master msg %s", err)
			continue
		}

		mc.handleMessage(msg)

		if presenceManager := GetPresenceManager(); presenceManager != nil {
			presenceManager.UpdateActivity(mc.UserID)
		}
	}
}

func (mc *MasterConn) handleMessage(msg MasterMessage) {
	data, ok := msg.Data.(map[string]interface{})
	if !ok && msg.Type != "leave_room" && msg.Type != "ping" {
		mc.sendError("Invalid message data")
		return
	}

	switch msg.Type {
	case "join_room":
		if err := mc.roomHandler.HandleJoinRoom(data); err != nil {
			mc.sendError(err.Error())
		} else {
			mc.sendSuccess("Joined room successfully", data)
		}
	case "leave_room":
		mc.roomHandler.HandleLeaveRoom()
		mc.sendSuccess("Left room successfully", nil)
	case "invite_to_room":
		if err := mc.roomHandler.HandleInviteToRoom(data); err != nil {
			mc.sendError(err.Error())
		} else {
			mc.sendSuccess("Invitation sent successfully", data)
		}
	case "respond_to_invitation":
		if err := mc.roomHandler.HandleRespondToInvitation(data); err != nil {
			mc.sendError(err.Error())
		} else {
			accept, _ := data["accept"].(bool)
			if accept {
				mc.sendSuccess("Invitation accepted successfully", data)
			} else {
				mc.sendSuccess("Invitation declined", data)
			}
		}
	case "room_message":
		if err := mc.roomHandler.HandleRoomMessage(data); err != nil {
			mc.sendError(err.Error())
		}
	case "set_status":
		mc.handleSetStatus(data)
	case "party_movie_selected":
		if err := mc.roomHandler.HandlePartyMovieSelected(data); err != nil {
			mc.sendError(err.Error())
		} else {
			mc.sendSuccess("Party movie selected successfully", data)
		}
	case "party_source_status":
		if err := mc.roomHandler.HandlePartySourceStatus(data); err != nil {
			mc.sendError(err.Error())
		} else {
			mc.sendSuccess("Party source status updated", data)
		}
	case "party_start":
		if err := mc.roomHandler.HandlePartyStart(data); err != nil {
			mc.sendError(err.Error())
		} else {
			mc.sendSuccess("Party started successfully", data)
		}
	case "party_movie_cleared":
		if err := mc.roomHandler.HandlePartyMovieCleared(data); err != nil {
			mc.sendError(err.Error())
		} else {
			mc.sendSuccess("Party movie cleared successfully", data)
		}
	case "party_sync_data":
		if err := mc.roomHandler.HandlePartySyncData(data); err != nil {
			mc.sendError(err.Error())
		}

	case "manual_sync_request":
		if err := mc.roomHandler.HandleManualSyncRequest(data); err != nil {
			mc.sendError(err.Error())
		}

	case "sync_status_update":
		if err := mc.roomHandler.HandleSyncStatusUpdate(data); err != nil {
			mc.sendError(err.Error())
		}
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (mc *MasterConn) handleSetStatus(data map[string]interface{}) {
	status, ok := data["status"].(string)
	if !ok {
		return
	}

	if presenceManager := GetPresenceManager(); presenceManager != nil {
		presenceManager.SetManualStatus(mc.UserID, status)
	}
}

func (mc *MasterConn) sendConnectionEstablished() {
	event := map[string]interface{}{
		"type":      "connection_established",
		"user_id":   mc.UserID,
		"timestamp": time.Now().Unix(),
		"data": map[string]interface{}{
			"message": "WebSocket connection established",
		},
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshaling connection event: %v", err)
		return
	}

	select {
	case mc.Send <- eventJSON:
		log.Printf("Sent connection established event to user %d", mc.UserID)
	default:
		log.Printf("Could not send connection event to user %d - buffer full", mc.UserID)
	}
}

func (mc *MasterConn) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		mc.Conn.Close()
		log.Printf("User %d disconnected from unified WebSocket", mc.UserID)
	}()

	for {
		select {
		case message, ok := <-mc.Send:
			mc.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				mc.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := mc.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(mc.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-mc.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			mc.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := mc.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}

		case <-mc.done:
			return
		}
	}
}

func (mc *MasterConn) sendError(message string) {
	errorMsg := map[string]interface{}{
		"type":      "error",
		"message":   message,
		"timestamp": time.Now().Unix(),
	}

	if jsonData, err := json.Marshal(errorMsg); err == nil {
		select {
		case mc.Send <- jsonData:
		default:
		}
	}
	log.Printf("Sent error to user %d: %s", mc.UserID, message)
}

func (mc *MasterConn) sendSuccess(message string, data map[string]interface{}) {
	successMsg := map[string]interface{}{
		"type":      "success",
		"message":   message,
		"timestamp": time.Now().Unix(),
	}

	if data != nil {
		successMsg["data"] = data
	}

	if jsonData, err := json.Marshal(successMsg); err == nil {
		select {
		case mc.Send <- jsonData:
		default:
		}
	}
}
