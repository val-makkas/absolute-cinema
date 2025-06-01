package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"
	"zync-stream/middleware"
	"zync-stream/rooms"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type RoomConnection struct {
	UserID   int
	Username string
	RoomID   int
	Conn     *websocket.Conn
	Send     chan []byte
}

type RoomEvent struct {
	Type      string                 `json:"type"`
	UserID    int                    `json:"user_id"`
	Username  string                 `json:"username,omitempty"`
	Timestamp int64                  `json:"timestamp"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

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

type MasterMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

type MasterConn struct {
	UserID      int
	Username    string
	Conn        *websocket.Conn
	Send        chan []byte
	done        chan struct{}
	currentRoom *int
}

var globalRoomRepo *rooms.RoomRepository

func SetRoomRepository(repo *rooms.RoomRepository) {
	globalRoomRepo = repo
}

func GetRoomRepository() *rooms.RoomRepository {
	return globalRoomRepo
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
	go masterConn.subscribeToNotifications()

	defer func() {
		if presenceManager := GetPresenceManager(); presenceManager != nil {
			presenceManager.RemoveConnection(userID)
		}
		if masterConn.currentRoom != nil {
			masterConn.leaveRoom(*masterConn.currentRoom)
		}
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
	switch msg.Type {
	case "join_room":
		mc.handleJoinRoom(msg)
	case "leave_room":
		mc.handleLeaveRoom()
	case "invite_to_room":
		mc.handleInviteToRoom(msg)
	case "respond_to_invitation":
		mc.handleRespondToInvitation(msg)
	case "room_message":
		mc.handleRoomMessage(msg)
	case "playback_sync":
		mc.handlePlaybackSync(msg)
	case "set_status":
		mc.handleSetStatus(msg)
	case "ping":
		mc.Send <- []byte(`{"type":"pong","timestamp":` + fmt.Sprintf("%d", time.Now().Unix()) + `}`)
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (mc *MasterConn) handleJoinRoom(msg MasterMessage) {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		mc.sendError("Invalid join room data")
		return
	}

	roomIDFloat, ok := data["room_id"].(float64)
	if !ok {
		mc.sendError("Invalid room ID")
		return
	}
	roomID := int(roomIDFloat)

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		mc.sendError("Room service unavailable")
		return
	}

	ctx := context.Background()
	isMember, role, err := roomRepo.IsRoomMember(ctx, roomID, mc.UserID)
	if err != nil {
		log.Printf("Error checking room membership for user %d in room %d: %v", mc.UserID, roomID, err)
		mc.sendError("Failed to check room membership")
		return
	}

	if !isMember {
		mc.sendError("You are not a member of this room")
		return
	}

	if mc.currentRoom != nil {
		mc.leaveRoom(*mc.currentRoom)
	}

	mc.currentRoom = &roomID
	mc.joinRoom(roomID)

	mc.sendSuccess("Joined room successfully", map[string]interface{}{
		"room_id": roomID,
		"role":    string(role),
	})

	log.Printf("User %d joined room %d as %s", mc.UserID, roomID, role)
}

func (mc *MasterConn) handleInviteToRoom(msg MasterMessage) {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		mc.sendError("Invalid invite data")
		return
	}

	roomIDFloat, ok := data["room_id"].(float64)
	if !ok {
		mc.sendError("Invalid room ID")
		return
	}
	roomID := int(roomIDFloat)

	username, ok := data["username"].(string)
	if !ok {
		mc.sendError("Invalid username")
		return
	}

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		mc.sendError("Room service unavailable")
		return
	}

	ctx := context.Background()

	isMember, _, err := roomRepo.IsRoomMember(ctx, roomID, mc.UserID)
	if err != nil || !isMember {
		mc.sendError("You are not a member of this room")
		return
	}

	inviteeID, err := roomRepo.GetUserIDByUsername(ctx, username)
	if err != nil {
		mc.sendError("User not found")
		return
	}

	invitationID, err := roomRepo.InviteToRoom(ctx, roomID, mc.UserID, inviteeID, nil) // Pass nil for redis
	if err != nil {
		log.Printf("Failed to send invitation: %v", err)
		mc.sendError("Failed to send invitation")
		return
	}

	room, _ := roomRepo.GetByID(ctx, roomID)
	roomName := "Unknown Room"
	if room != nil {
		roomName = room.Name
	}

	if err := SendRoomInviteNotification(inviteeID, mc.UserID, mc.Username, roomID, roomName); err != nil {
		log.Printf("Failed to send invitation notification: %v", err)
	}

	mc.sendSuccess("Invitation sent successfully", map[string]interface{}{
		"invitation_id": invitationID,
		"invitee":       username,
		"room_id":       roomID,
	})

	log.Printf("User %d invited %s to room %d", mc.UserID, username, roomID)
}

func (mc *MasterConn) handleRespondToInvitation(msg MasterMessage) {
	data, ok := msg.Data.(map[string]interface{})
	if !ok {
		mc.sendError("Invalid response data")
		return
	}

	inviteIDFloat, ok := data["invitation_id"].(float64)
	if !ok {
		mc.sendError("Invalid invitation ID")
		return
	}
	invitationID := int(inviteIDFloat)

	accept, ok := data["accept"].(bool)
	if !ok {
		mc.sendError("Invalid accept value")
		return
	}

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		mc.sendError("Room service unavailable")
		return
	}

	ctx := context.Background()

	err := roomRepo.RespondToInvitation(ctx, invitationID, mc.UserID, accept, nil)
	if err != nil {
		log.Printf("Failed to respond to invitation: %v", err)
		mc.sendError("Failed to process invitation response")
		return
	}

	if accept {
		mc.sendSuccess("Invitation accepted successfully", map[string]interface{}{
			"invitation_id": invitationID,
		})
	} else {
		mc.sendSuccess("Invitation declined", map[string]interface{}{
			"invitation_id": invitationID,
		})
	}

	log.Printf("User %d %s invitation %d", mc.UserID, map[bool]string{true: "accepted", false: "declined"}[accept], invitationID)
}

func (mc *MasterConn) handleLeaveRoom() {
	if mc.currentRoom != nil {
		mc.leaveRoom(*mc.currentRoom)
		mc.currentRoom = nil
	}
}

func (mc *MasterConn) handleRoomMessage(msg MasterMessage) {
	if mc.currentRoom == nil {
		mc.sendError("Not in any room")
		return
	}

	// Verify membership
	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		mc.sendError("Room service unavailable")
		return
	}

	ctx := context.Background()
	isMember, _, err := roomRepo.IsRoomMember(ctx, *mc.currentRoom, mc.UserID)
	if err != nil || !isMember {
		mc.sendError("You are no longer a member of this room")
		mc.currentRoom = nil
		return
	}

	event := RoomEvent{
		Type:      "chat_message",
		UserID:    mc.UserID,
		Username:  mc.Username,
		Timestamp: time.Now().Unix(),
		Data:      msg.Data.(map[string]interface{}),
	}

	mc.publishRoomEvent(*mc.currentRoom, event)
}

func (mc *MasterConn) handlePlaybackSync(msg MasterMessage) {
	if mc.currentRoom == nil {
		mc.sendError("Not in any room")
		return
	}

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		mc.sendError("Room service unavailable")
		return
	}

	ctx := context.Background()
	isMember, role, err := roomRepo.IsRoomMember(ctx, *mc.currentRoom, mc.UserID)
	if err != nil || !isMember {
		mc.sendError("You are no longer a member of this room")
		mc.currentRoom = nil
		return
	}

	if role == "" {
		mc.sendError("Invalid role")
		return
	}

	event := RoomEvent{
		Type:      "playback_update",
		UserID:    mc.UserID,
		Username:  mc.Username,
		Timestamp: time.Now().Unix(),
		Data:      msg.Data.(map[string]interface{}),
	}

	mc.publishRoomEvent(*mc.currentRoom, event)
	log.Printf("User %d (%s) controlled playback in room %d", mc.UserID, role, *mc.currentRoom)
}

func (mc *MasterConn) handleSetStatus(msg MasterMessage) {
	data, k := msg.Data.(map[string]interface{})
	if !k {
		return
	}

	status, ok := data["status"].(string)
	if !ok {
		return
	}

	if presenceManager := GetPresenceManager(); presenceManager != nil {
		presenceManager.SetManualStatus(mc.UserID, status)
	}
}

func (mc *MasterConn) joinRoom(roomID int) {
	go mc.subscribeToRoomEvents(roomID)

	event := RoomEvent{
		Type:      "user_joined",
		UserID:    mc.UserID,
		Username:  mc.Username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  mc.UserID,
			"username": mc.Username,
			"message":  fmt.Sprintf("%s has joined the room", mc.Username),
		},
	}

	mc.publishRoomEvent(roomID, event)

	if presenceManager := GetPresenceManager(); presenceManager != nil {
		presenceManager.SetWatching(mc.UserID, fmt.Sprintf("Room %d", roomID), map[string]interface{}{
			"room_id": roomID,
		})
	}
}

func (mc *MasterConn) leaveRoom(roomID int) {
	event := RoomEvent{
		Type:      "user_left",
		UserID:    mc.UserID,
		Username:  mc.Username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  mc.UserID,
			"username": mc.Username,
			"message":  fmt.Sprintf("%s has left the room", mc.Username),
		},
	}

	mc.publishRoomEvent(roomID, event)

	if presenceManager := GetPresenceManager(); presenceManager != nil {
		presenceManager.StopWatching(mc.UserID)
	}
}

func (mc *MasterConn) subscribeToRoomEvents(roomID int) {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	roomChannel := fmt.Sprintf("room:%d:events", roomID)
	pubsub := redisClient.Subscribe(context.Background(), roomChannel)
	defer pubsub.Close()

	log.Printf("User %d subscribed to room %d events", mc.UserID, roomID)

	for {
		select {
		case <-mc.done:
			return
		default:
			msg, err := pubsub.ReceiveMessage(context.Background())
			if err != nil {
				log.Printf("Error receiving room message: %v", err)
				return
			}

			select {
			case mc.Send <- []byte(msg.Payload):
			case <-mc.done:
				return
			default:
				log.Printf("Send buffer full for user %d in room %d, dropping message", mc.UserID, roomID)
			}
		}
	}
}

func (mc *MasterConn) subscribeToNotifications() {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	notificationChannel := fmt.Sprintf("user:%d:notifications", mc.UserID)
	pubsub := redisClient.Subscribe(context.Background(), notificationChannel)
	defer pubsub.Close()

	log.Printf("User %d subscribed to notifications", mc.UserID)

	for {
		select {
		case <-mc.done:
			return
		default:
			msg, err := pubsub.ReceiveMessage(context.Background())
			if err != nil {
				log.Printf("Error receiving notification: %v", err)
				return
			}

			select {
			case mc.Send <- []byte(msg.Payload):
			case <-mc.done:
				return
			default:
				log.Printf("Notification buffer full for user %d, dropping message", mc.UserID)
			}
		}
	}
}

func (mc *MasterConn) publishRoomEvent(roomID int, event RoomEvent) {
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

	roomChannel := fmt.Sprintf("room:%d:events", roomID)
	if err := redisClient.Publish(context.Background(), roomChannel, eventJSON).Err(); err != nil {
		log.Printf("Error publishing event: %v", err)
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

func SendNotification(userID int, notificationType string, data map[string]interface{}) error {
	redisClient, err := GetRedisClient()
	if err != nil {
		return fmt.Errorf("failed to get Redis client: %v", err)
	}

	notification := map[string]interface{}{
		"type":              "notification",
		"notification_type": notificationType,
		"user_id":           userID,
		"timestamp":         time.Now().Unix(),
		"data":              data,
	}

	notificationJSON, err := json.Marshal(notification)
	if err != nil {
		return fmt.Errorf("failed to marshal notification: %v", err)
	}

	userChannel := fmt.Sprintf("user:%d:notifications", userID)
	err = redisClient.Publish(context.Background(), userChannel, notificationJSON).Err()
	if err != nil {
		return fmt.Errorf("failed to publish notification: %v", err)
	}

	log.Printf("📨 Sent %s notification to user %d", notificationType, userID)
	return nil
}

func SendFriendRequestNotification(toUserID, fromUserID int, fromUsername, fromDisplayName string) error {
	data := map[string]interface{}{
		"sender_id":    fromUserID,
		"username":     fromUsername,
		"display_name": fromDisplayName,
	}
	return SendNotification(toUserID, "friend_request_received", data)
}

func SendFriendRequestAcceptedNotification(toUserID, fromUserID int, fromUsername, fromDisplayName string) error {
	data := map[string]interface{}{
		"accepter_id":  fromUserID,
		"username":     fromUsername,
		"display_name": fromDisplayName,
	}
	return SendNotification(toUserID, "friend_request_accepted", data)
}

func SendFriendRequestRejectedNotification(toUserID, fromUserID int, fromUsername, fromDisplayName string) error {
	data := map[string]interface{}{
		"rejecter_id":  fromUserID,
		"username":     fromUsername,
		"display_name": fromDisplayName,
	}
	return SendNotification(toUserID, "friend_request_rejected", data)
}

func SendRoomInviteNotification(toUserID, fromUserID int, fromUsername string, roomID int, roomName string) error {
	data := map[string]interface{}{
		"inviter_id":   fromUserID,
		"inviter_name": fromUsername,
		"room_id":      roomID,
		"room_name":    roomName,
	}
	return SendNotification(toUserID, "room_invitation", data)
}

func SendRoomInviteAcceptedNotification(toUserID, fromUserID int, fromUsername string, roomID int, roomName string) error {
	data := map[string]interface{}{
		"accepter_id":   fromUserID,
		"accepter_name": fromUsername,
		"room_id":       roomID,
		"room_name":     roomName,
	}
	return SendNotification(toUserID, "invitation_accepted", data)
}

func SendRoomInviteRejectedNotification(toUserID, fromUserID int, fromUsername string, roomID int, roomName string) error {
	data := map[string]interface{}{
		"rejecter_id":   fromUserID,
		"rejecter_name": fromUsername,
		"room_id":       roomID,
		"room_name":     roomName,
	}
	return SendNotification(toUserID, "invitation_rejected", data)
}

func SendStatusUpdate(userID int, status, activity string, customData map[string]interface{}) error {
	redisClient, err := GetRedisClient()
	if err != nil {
		return fmt.Errorf("failed to get Redis client: %v", err)
	}

	// Get user info from presence manager
	presenceManager := GetPresenceManager()
	if presenceManager == nil {
		return fmt.Errorf("presence manager not initialized")
	}

	presence := presenceManager.GetUserStatus(userID)
	if presence == nil {
		log.Printf("User %d not found in presence, using basic info", userID)
		presence = &UserPresence{
			UserID:   userID,
			Username: fmt.Sprintf("user_%d", userID),
			Status:   status,
			Activity: activity,
		}
	}

	statusUpdate := map[string]interface{}{
		"type": "status_update",
		"data": map[string]interface{}{
			"user_id":   userID,
			"username":  presence.Username,
			"status":    status,
			"activity":  activity,
			"timestamp": time.Now().Unix(),
			"data":      customData,
		},
	}

	statusJSON, err := json.Marshal(statusUpdate)
	if err != nil {
		return fmt.Errorf("failed to marshal status update: %v", err)
	}

	log.Printf("📨 Broadcasting status update for user %d: %s", userID, status)

	ctx := context.Background()
	friendIDs, err := presenceManager.userRepo.GetUserFriends(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get friends: %v", err)
	}

	log.Printf("👥 Sending status update to %d friends", len(friendIDs))

	sentCount := 0
	for _, friendID := range friendIDs {
		userChannel := fmt.Sprintf("user:%d:notifications", friendID)
		err = redisClient.Publish(context.Background(), userChannel, statusJSON).Err()
		if err != nil {
			log.Printf("Failed to send status update to friend %d: %v", friendID, err)
		} else {
			sentCount++
			log.Printf("Sent status update to friend %d", friendID)
		}
	}

	log.Printf("Status update sent to %d/%d friends via Redis", sentCount, len(friendIDs))
	return nil
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
