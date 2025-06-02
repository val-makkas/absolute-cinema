package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"
	"zync-stream/rooms"
)

type RoomEvent struct {
	Type      string                 `json:"type"`
	UserID    int                    `json:"user_id"`
	Username  string                 `json:"username,omitempty"`
	Timestamp int64                  `json:"timestamp"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

type RoomHandler struct {
	userID      int
	username    string
	send        chan []byte
	done        chan struct{}
	currentRoom *int
}

func NewRoomHandler(userID int, username string, send chan []byte, done chan struct{}) *RoomHandler {
	return &RoomHandler{
		userID:   userID,
		username: username,
		send:     send,
		done:     done,
	}
}

func (rh *RoomHandler) HandleJoinRoom(data map[string]interface{}) error {
	roomIDFloat, ok := data["room_id"].(float64)
	if !ok {
		return fmt.Errorf("invalid room ID")
	}
	roomID := int(roomIDFloat)

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		return fmt.Errorf("room service unavailable")
	}

	ctx := context.Background()
	isMember, role, err := roomRepo.IsRoomMember(ctx, roomID, rh.userID)
	if err != nil {
		return fmt.Errorf("failed to check room membership: %v", err)
	}

	if !isMember {
		return fmt.Errorf("you are not a member of this room")
	}

	if rh.currentRoom != nil {
		rh.leaveRoom(*rh.currentRoom)
	}

	rh.currentRoom = &roomID
	rh.joinRoom(roomID)

	log.Printf("User %d joined room %d as %s", rh.userID, roomID, role)
	return nil
}

func (rh *RoomHandler) HandleInviteToRoom(data map[string]interface{}) error {
	roomIDFloat, ok := data["room_id"].(float64)
	if !ok {
		return fmt.Errorf("invalid room ID")
	}
	roomID := int(roomIDFloat)

	username, ok := data["username"].(string)
	if !ok {
		return fmt.Errorf("invalid username")
	}

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		return fmt.Errorf("room service unavailable")
	}

	ctx := context.Background()

	isMember, _, err := roomRepo.IsRoomMember(ctx, roomID, rh.userID)
	if err != nil || !isMember {
		return fmt.Errorf("you are not a member of this room")
	}

	inviteeID, err := roomRepo.GetUserIDByUsername(ctx, username)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	invitationID, err := roomRepo.InviteToRoom(ctx, roomID, rh.userID, inviteeID, nil)
	if err != nil {
		return fmt.Errorf("failed to send invitation: %v", err)
	}

	room, _ := roomRepo.GetByID(ctx, roomID)
	roomName := "Unknown Room"
	if room != nil {
		roomName = room.Name
	}

	rh.sendRoomInvitationEvent(inviteeID, roomID, roomName, invitationID)

	log.Printf("User %d invited %s to room %d", rh.userID, username, roomID)
	return nil
}

func (rh *RoomHandler) HandleRespondToInvitation(data map[string]interface{}) error {
	inviteIDFloat, ok := data["invitation_id"].(float64)
	if !ok {
		return fmt.Errorf("invalid invitation ID")
	}
	invitationID := int(inviteIDFloat)

	accept, ok := data["accept"].(bool)
	if !ok {
		return fmt.Errorf("invalid accept value")
	}

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		return fmt.Errorf("room service unavailable")
	}

	ctx := context.Background()

	invitation, err := roomRepo.GetInvitationByID(ctx, invitationID)
	if err != nil {
		return fmt.Errorf("failed to get invitation details: %v", err)
	}

	if invitation.InviteeID != rh.userID {
		return fmt.Errorf("invitation not found or not for this user")
	}

	err = roomRepo.RespondToInvitation(ctx, invitationID, rh.userID, accept, nil)
	if err != nil {
		return fmt.Errorf("failed to process invitation response: %v", err)
	}

	if accept {
		rh.broadcastMemberListUpdate(invitation.RoomID)
		rh.broadcastUserJoined(invitation.RoomID)
	}

	log.Printf("User %d %s invitation %d", rh.userID, map[bool]string{true: "accepted", false: "declined"}[accept], invitationID)
	return nil
}

func (rh *RoomHandler) HandleLeaveRoom() {
	if rh.currentRoom != nil {
		rh.leaveRoom(*rh.currentRoom)
		rh.currentRoom = nil
	}
}

func (rh *RoomHandler) HandleRoomMessage(data map[string]interface{}) error {
	if rh.currentRoom == nil {
		return fmt.Errorf("not in any room")
	}

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		return fmt.Errorf("room service unavailable")
	}

	ctx := context.Background()
	isMember, _, err := roomRepo.IsRoomMember(ctx, *rh.currentRoom, rh.userID)
	if err != nil || !isMember {
		rh.currentRoom = nil
		return fmt.Errorf("you are no longer a member of this room")
	}

	event := RoomEvent{
		Type:      "chat_message",
		UserID:    rh.userID,
		Username:  rh.username,
		Timestamp: time.Now().Unix(),
		Data:      data,
	}

	rh.publishRoomEvent(*rh.currentRoom, event)
	return nil
}

func (rh *RoomHandler) HandlePlaybackSync(data map[string]interface{}) error {
	if rh.currentRoom == nil {
		return fmt.Errorf("not in any room")
	}

	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		return fmt.Errorf("room service unavailable")
	}

	ctx := context.Background()
	isMember, role, err := roomRepo.IsRoomMember(ctx, *rh.currentRoom, rh.userID)
	if err != nil || !isMember {
		rh.currentRoom = nil
		return fmt.Errorf("you are no longer a member of this room")
	}

	event := RoomEvent{
		Type:      "playback_update",
		UserID:    rh.userID,
		Username:  rh.username,
		Timestamp: time.Now().Unix(),
		Data:      data,
	}

	rh.publishRoomEvent(*rh.currentRoom, event)
	log.Printf("User %d (%s) controlled playback in room %d", rh.userID, role, *rh.currentRoom)
	return nil
}

func (rh *RoomHandler) GetCurrentRoom() *int {
	return rh.currentRoom
}

func (rh *RoomHandler) Cleanup() {
	if rh.currentRoom != nil {
		rh.leaveRoom(*rh.currentRoom)
	}
}

func (rh *RoomHandler) joinRoom(roomID int) {
	go rh.subscribeToRoomEvents(roomID)

	event := RoomEvent{
		Type:      "user_joined",
		UserID:    rh.userID,
		Username:  rh.username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  rh.userID,
			"username": rh.username,
			"message":  fmt.Sprintf("%s has joined the room", rh.username),
		},
	}

	rh.publishRoomEvent(roomID, event)

	if presenceManager := GetPresenceManager(); presenceManager != nil {
		presenceManager.SetWatching(rh.userID, fmt.Sprintf("Room %d", roomID), map[string]interface{}{
			"room_id": roomID,
		})
	}
}

func (rh *RoomHandler) leaveRoom(roomID int) {
	event := RoomEvent{
		Type:      "user_left",
		UserID:    rh.userID,
		Username:  rh.username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  rh.userID,
			"username": rh.username,
			"message":  fmt.Sprintf("%s has left the room", rh.username),
		},
	}

	rh.publishRoomEvent(roomID, event)

	if presenceManager := GetPresenceManager(); presenceManager != nil {
		presenceManager.StopWatching(rh.userID)
	}
}

func (rh *RoomHandler) subscribeToRoomEvents(roomID int) {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	roomChannel := fmt.Sprintf("room:%d:events", roomID)
	pubsub := redisClient.Subscribe(context.Background(), roomChannel)
	defer pubsub.Close()

	log.Printf("User %d subscribed to room %d events", rh.userID, roomID)

	for {
		select {
		case <-rh.done:
			return
		default:
			msg, err := pubsub.ReceiveMessage(context.Background())
			if err != nil {
				log.Printf("Error receiving room message: %v", err)
				return
			}

			select {
			case rh.send <- []byte(msg.Payload):
			case <-rh.done:
				return
			default:
				log.Printf("Send buffer full for user %d in room %d, dropping message", rh.userID, roomID)
			}
		}
	}
}

func (rh *RoomHandler) subscribeToPersonalRoomInvitations() {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	invitationChannel := fmt.Sprintf("user:%d:room_invitations", rh.userID)
	pubsub := redisClient.Subscribe(context.Background(), invitationChannel)
	defer pubsub.Close()

	log.Printf("User %d subscribed to personal room invitations", rh.userID)

	for {
		select {
		case <-rh.done:
			return
		default:
			msg, err := pubsub.ReceiveMessage(context.Background())
			if err != nil {
				log.Printf("Error receiving room invitation: %v", err)
				return
			}

			select {
			case rh.send <- []byte(msg.Payload):
			case <-rh.done:
				return
			default:
				log.Printf("Room invitation buffer full for user %d, dropping message", rh.userID)
			}
		}
	}
}

func (rh *RoomHandler) publishRoomEvent(roomID int, event RoomEvent) {
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

func (rh *RoomHandler) sendRoomInvitationEvent(toUserID, roomID int, roomName string, invitationID int) {
	invitationEvent := RoomEvent{
		Type:      "room_invitation",
		UserID:    rh.userID,
		Username:  rh.username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"invitation_id": invitationID,
			"inviter_id":    rh.userID,
			"inviter_name":  rh.username,
			"room_id":       roomID,
			"room_name":     roomName,
			"target_user":   toUserID,
		},
	}

	rh.publishRoomInvitationEvent(toUserID, invitationEvent)
}

func (rh *RoomHandler) publishRoomInvitationEvent(toUserID int, event RoomEvent) {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error serializing invitation event: %v", err)
		return
	}

	userInvitationChannel := fmt.Sprintf("user:%d:room_invitations", toUserID)
	if err := redisClient.Publish(context.Background(), userInvitationChannel, eventJSON).Err(); err != nil {
		log.Printf("Error publishing invitation event: %v", err)
	} else {
		log.Printf("Sent room invitation event to user %d", toUserID)
	}
}

func (rh *RoomHandler) broadcastUserJoined(roomID int) {
	event := RoomEvent{
		Type:      "user_joined",
		UserID:    rh.userID,
		Username:  rh.username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"user_id":  rh.userID,
			"username": rh.username,
			"message":  fmt.Sprintf("%s joined the room", rh.username),
			"via":      "invitation",
		},
	}

	rh.publishRoomEvent(roomID, event)
	log.Printf("User %s joined room %d via invitation", rh.username, roomID)
}

func (rh *RoomHandler) broadcastMemberListUpdate(roomID int) {
	roomRepo := GetRoomRepository()
	if roomRepo == nil {
		log.Printf("Room repository not available for member list update")
		return
	}

	ctx := context.Background()
	members, err := roomRepo.GetRoomMembers(ctx, roomID)
	if err != nil {
		log.Printf("Failed to get room members: %v", err)
		return
	}

	event := RoomEvent{
		Type:      "member_list_update",
		UserID:    rh.userID,
		Username:  rh.username,
		Timestamp: time.Now().Unix(),
		Data: map[string]interface{}{
			"members":     members,
			"new_member":  rh.userID,
			"member_name": rh.username,
			"action":      "member_added",
		},
	}

	rh.publishRoomEvent(roomID, event)
	log.Printf("📋 Broadcasted member list update to room %d (new member: %s)", roomID, rh.username)
}

func (rh *RoomHandler) Subscribe() {
	go rh.subscribeToPersonalRoomInvitations()
}

var globalRoomRepo *rooms.RoomRepository

func SetRoomRepository(repo *rooms.RoomRepository) {
	globalRoomRepo = repo
}

func GetRoomRepository() *rooms.RoomRepository {
	return globalRoomRepo
}
