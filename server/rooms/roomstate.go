package rooms

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
    // Redis keys
    playbackStateKey = "room:%d:playback"
    viewersKey       = "room:%d:viewers"
    
    // Notification types
    NotificationTypeInvitation    = "room_invitation"
    NotificationTypeInviteAccept  = "invitation_accepted"
    NotificationTypeInviteReject  = "invitation_rejected"
)

// RoomStateManager handles real-time room state using Redis
type RoomStateManager struct {
    redis *redis.Client
}

// NewRoomStateManager creates a new RoomStateManager
func NewRoomStateManager(redis *redis.Client) *RoomStateManager {
    return &RoomStateManager{redis: redis}
}

// UpdatePlaybackState updates the playback state in Redis
func (m *RoomStateManager) UpdatePlaybackState(ctx context.Context, state *PlaybackState) error {
    if m.redis == nil {
        return fmt.Errorf("redis client not available")
    }

    state.UpdatedAt = time.Now()
    data, err := json.Marshal(state)
    if err != nil {
        return err
    }

    key := fmt.Sprintf(playbackStateKey, state.RoomID)
    if err := m.redis.Set(ctx, key, data, 24*time.Hour).Err(); err != nil {
        return err
    }

    // Publish update event
    event := map[string]interface{}{
        "type":       "playback_update",
        "room_id":    state.RoomID,
        "state":      state,
        "updated_by": state.UpdatedBy,
        "timestamp":  time.Now().Unix(),
    }

    eventData, _ := json.Marshal(event)
    m.redis.Publish(ctx, fmt.Sprintf("room:%d:events", state.RoomID), eventData)

    return nil
}

// GetPlaybackState gets the current playback state from Redis
func (m *RoomStateManager) GetPlaybackState(ctx context.Context, roomID int) (*PlaybackState, error) {
    if m.redis == nil {
        return nil, fmt.Errorf("redis client not available")
    }

    key := fmt.Sprintf(playbackStateKey, roomID)
    data, err := m.redis.Get(ctx, key).Bytes()
    if err != nil {
        if err == redis.Nil {
            return nil, nil // No state found
        }
        return nil, err
    }

    var state PlaybackState
    if err := json.Unmarshal(data, &state); err != nil {
        return nil, err
    }

    return &state, nil
}

// AddViewer adds a viewer to a room
func (m *RoomStateManager) AddViewer(ctx context.Context, roomID, userID int, username, avatarURL string) error {
    if m.redis == nil {
        return fmt.Errorf("redis client not available")
    }

    viewer := Viewer{
        UserID:    userID,
        Username:  username,
        AvatarURL: avatarURL,
    }

    data, err := json.Marshal(viewer)
    if err != nil {
        return err
    }

    key := fmt.Sprintf(viewersKey, roomID)
    field := fmt.Sprintf("user:%d", userID)

    // Add to hash
    if err := m.redis.HSet(ctx, key, field, data).Err(); err != nil {
        return err
    }

    // Set expiration on the hash
    m.redis.Expire(ctx, key, 1*time.Hour)

    // Publish viewer joined event
    event := map[string]interface{}{
        "type":      "viewer_joined",
        "room_id":   roomID,
        "user_id":   userID,
        "username":  username,
        "timestamp": time.Now().Unix(),
    }

    eventData, _ := json.Marshal(event)
    m.redis.Publish(ctx, fmt.Sprintf("room:%d:events", roomID), eventData)

    return nil
}

// RemoveViewer removes a viewer from a room
func (m *RoomStateManager) RemoveViewer(ctx context.Context, roomID, userID int) error {
    if m.redis == nil {
        return fmt.Errorf("redis client not available")
    }

    key := fmt.Sprintf(viewersKey, roomID)
    field := fmt.Sprintf("user:%d", userID)

    // Remove from hash
    if err := m.redis.HDel(ctx, key, field).Err(); err != nil {
        return err
    }

    // Publish viewer left event
    event := map[string]interface{}{
        "type":      "viewer_left",
        "room_id":   roomID,
        "user_id":   userID,
        "timestamp": time.Now().Unix(),
    }

    eventData, _ := json.Marshal(event)
    m.redis.Publish(ctx, fmt.Sprintf("room:%d:events", roomID), eventData)

    return nil
}

// GetViewers gets all viewers in a room
func (m *RoomStateManager) GetViewers(ctx context.Context, roomID int) ([]Viewer, error) {
    if m.redis == nil {
        return nil, fmt.Errorf("redis client not available")
    }

    key := fmt.Sprintf(viewersKey, roomID)
    data, err := m.redis.HGetAll(ctx, key).Result()
    if err != nil {
        return nil, err
    }

    viewers := make([]Viewer, 0, len(data))
    for _, v := range data {
        var viewer Viewer
        if err := json.Unmarshal([]byte(v), &viewer); err != nil {
            continue
        }
        viewers = append(viewers, viewer)
    }

    return viewers, nil
}

// SendInvitation sends a room invitation notification
func (m *RoomStateManager) SendInvitation(ctx context.Context, invitationID, roomID int, roomName string, 
    inviterID int, inviterName string, invitedUserID int) {
    
    if m.redis == nil {
        return
    }

    notification := map[string]interface{}{
        "type":           NotificationTypeInvitation,
        "invitation_id":  invitationID,
        "room_id":        roomID,
        "room_name":      roomName,
        "inviter_id":     inviterID,
        "inviter_name":   inviterName,
        "timestamp":      time.Now().Unix(),
        "message":        fmt.Sprintf("%s has invited you to join room: %s", inviterName, roomName),
    }

    data, _ := json.Marshal(notification)
    m.redis.Publish(ctx, fmt.Sprintf("user:%d:notifications", invitedUserID), data)
}

// SendInviteResponse sends a notification about an invitation response
func (m *RoomStateManager) SendInviteResponse(ctx context.Context, invitationID, roomID int, roomName string, 
    responderID int, responderName string, inviterID int, accepted bool) {
    
    if m.redis == nil {
        return
    }

    notificationType := NotificationTypeInviteReject
    message := fmt.Sprintf("%s declined your invitation to room: %s", responderName, roomName)
    
    if accepted {
        notificationType = NotificationTypeInviteAccept
        message = fmt.Sprintf("%s accepted your invitation to room: %s", responderName, roomName)
    }

    notification := map[string]interface{}{
        "type":           notificationType,
        "invitation_id":  invitationID,
        "room_id":        roomID,
        "room_name":      roomName,
        "responder_id":   responderID,
        "responder_name": responderName,
        "timestamp":      time.Now().Unix(),
        "message":        message,
        "accepted":       accepted,
    }

    data, _ := json.Marshal(notification)
    m.redis.Publish(ctx, fmt.Sprintf("user:%d:notifications", inviterID), data)
}