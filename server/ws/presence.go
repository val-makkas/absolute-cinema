package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

const (
	StatusOnline   = "online"
	StatusDND      = "dnd"
	StatusWatching = "watching"
	StatusOffline  = "offline"
)

type UserPresence struct {
	UserID       int                    `json:"user_id"`
	Username     string                 `json:"username"`
	Status       string                 `json:"status"`
	Activity     string                 `json:"activity"`
	LastActivity time.Time              `json:"last_activity"`
	ConnectedAt  time.Time              `json:"connected_at"`
	ManualStatus string                 `json:"manual_status"`
	CustomData   map[string]interface{} `json:"custom_data"`
}

type PresenceManager struct {
	users       map[int]*UserPresence
	connections map[int]*NotificationConnection
	mutex       sync.RWMutex
	userRepo    UserRepository
}

type FriendStatusInfo struct {
	UserID   int       `json:"user_id"`
	Username string    `json:"username"`
	Status   string    `json:"status"`
	Activity string    `json:"activity"`
	LastSeen time.Time `json:"last_seen"`
}

type UserRepository interface {
	UpdateUserStatus(ctx context.Context, userID int, status, activity string) error
	GetUserFriends(ctx context.Context, userID int) ([]int, error)
	GetFriendsWithStatus(ctx context.Context, userID int) ([]FriendStatusInfo, error)
}

type StatusUpdate struct {
	Type string `json:"type"`
	Data struct {
		UserID    int                    `json:"user_id"`
		Username  string                 `json:"username"`
		Status    string                 `json:"status"`
		Activity  string                 `json:"activity"`
		Timestamp int64                  `json:"timestamp"`
		Data      map[string]interface{} `json:"data,omitempty"`
	} `json:"data"`
}

var presenceManager *PresenceManager

func InitPresenceManager(userRepo UserRepository) {
	presenceManager = &PresenceManager{
		users:       make(map[int]*UserPresence),
		connections: make(map[int]*NotificationConnection),
		userRepo:    userRepo,
	}
}

func GetPresenceManager() *PresenceManager {
	return presenceManager
}

func (pm *PresenceManager) AddConnection(userID int, username string, conn *NotificationConnection) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	log.Printf("👤 User %d (%s) connecting...", userID, username)

	// Store connection
	pm.connections[userID] = conn
	log.Printf("Total connections: %d", len(pm.connections))

	// Create or update presence
	if presence := pm.users[userID]; presence != nil {
		presence.ConnectedAt = time.Now()
		presence.LastActivity = time.Now()
		log.Printf("👤 Updated existing presence for user %d", userID)
	} else {
		pm.users[userID] = &UserPresence{
			UserID:       userID,
			Username:     username,
			Status:       StatusOffline,
			Activity:     "",
			LastActivity: time.Now(),
			ConnectedAt:  time.Now(),
			ManualStatus: "",
			CustomData:   make(map[string]interface{}),
		}
		log.Printf("👤 Created new presence for user %d", userID)
	}

	log.Printf("📊 Total users in presence: %d", len(pm.users))

	// This will trigger a status broadcast
	pm.updateUserStatus(userID, false)

	// Send initial status snapshot
	go pm.sendInitialStatusSnapshot(userID, conn)
}

func (pm *PresenceManager) RemoveConnection(userID int) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	presence, exists := pm.users[userID]
	if !exists {
		log.Printf("No presence found for user %d on disconnect", userID)
		return
	}

	username := presence.Username
	oldStatus := presence.Status

	log.Printf("👤 User %d (%s) disconnecting... (current status: %s)", userID, username, oldStatus)

	delete(pm.connections, userID)

	pm.updateUserStatus(userID, true)

	delete(pm.users, userID)

	log.Printf("👤 User %d (%s) cleanup complete", userID, username)
}

func (pm *PresenceManager) sendInitialStatusSnapshot(userID int, conn *NotificationConnection) {
	ctx := context.Background()

	// Get friends from database with last known status
	friends, err := pm.userRepo.GetFriendsWithStatus(ctx, userID)
	if err != nil {
		return
	}

	for _, friend := range friends {
		var statusUpdate StatusUpdate

		// Check if friend is currently connected (in-memory = live data)
		pm.mutex.RLock()
		if currentPresence, exists := pm.users[friend.UserID]; exists {
			presenceCopy := *currentPresence
			pm.mutex.RUnlock()
			statusUpdate = pm.createStatusUpdateFromPresence(&presenceCopy)
		} else {
			pm.mutex.RUnlock()
			statusUpdate = pm.createStatusUpdateFromDB(friend)
		}

		statusJSON, err := json.Marshal(statusUpdate)
		if err != nil {
			continue
		}

		select {
		case conn.Send <- statusJSON:
		default:
		}
	}
}

func (pm *PresenceManager) UpdateActivity(userID int) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	presence, exists := pm.users[userID]
	if !exists {
		return
	}

	presence.LastActivity = time.Now()
}

func (pm *PresenceManager) SetWatching(userID int, content string, customData map[string]interface{}) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	presence, exists := pm.users[userID]
	if !exists {
		return
	}

	presence.Status = StatusWatching
	presence.Activity = fmt.Sprintf("Watching %s", content)
	presence.LastActivity = time.Now()
	if customData != nil {
		presence.CustomData = customData
	}

	pm.updateUserStatus(userID, false)
}

func (pm *PresenceManager) StopWatching(userID int) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	presence, exists := pm.users[userID]
	if !exists {
		return
	}

	if presence.Status == StatusWatching {
		presence.Activity = ""
		presence.CustomData = make(map[string]interface{})
		presence.LastActivity = time.Now()

		pm.updateUserStatus(userID, false)
	}
}

func (pm *PresenceManager) SetManualStatus(userID int, status string) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	presence, exists := pm.users[userID]
	if !exists {
		return
	}

	presence.ManualStatus = status
	presence.LastActivity = time.Now()

	pm.updateUserStatus(userID, false)
}

func (pm *PresenceManager) ClearManualStatus(userID int) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	presence, exists := pm.users[userID]
	if !exists {
		return
	}

	presence.ManualStatus = ""
	presence.LastActivity = time.Now()

	pm.updateUserStatus(userID, false)
}

func (pm *PresenceManager) updateUserStatus(userID int, isDisconnecting bool) {
	presence := pm.users[userID]
	if presence == nil {
		log.Printf("No presence found for user %d", userID)
		return
	}

	oldStatus := presence.Status
	newStatus := pm.calculateEffectiveStatus(presence, isDisconnecting)

	log.Printf("👤 User %d status: %s -> %s (disconnecting: %v)", userID, oldStatus, newStatus, isDisconnecting)

	if newStatus != oldStatus {
		presence.Status = newStatus
		log.Printf("Status changed for user %d, broadcasting to friends...", userID)

		go func() {
			ctx := context.Background()
			if err := pm.userRepo.UpdateUserStatus(ctx, userID, newStatus, presence.Activity); err != nil {
				log.Printf("Failed to update user %d status in DB: %v", userID, err)
			} else {
				log.Printf("Updated user %d status in DB", userID)
			}
		}()

		go pm.broadcastStatusToFriends(userID, newStatus, presence.Activity, presence.CustomData)
	} else {
		log.Printf("No status change for user %d, skipping broadcast", userID)
	}
}

func (pm *PresenceManager) calculateEffectiveStatus(presence *UserPresence, isDisconnecting bool) string {
	if isDisconnecting {
		return StatusOffline
	}

	if presence.Status == StatusWatching {
		return StatusWatching
	}

	if presence.ManualStatus == StatusDND {
		return StatusDND
	}

	return StatusOnline
}

func (pm *PresenceManager) broadcastStatusToFriends(userID int, status, activity string, customData map[string]interface{}) {
	log.Printf("👤 Broadcasting status update for user %d: %s -> %s", userID, status, activity)

	if err := SendStatusUpdate(userID, status, activity, customData); err != nil {
		log.Printf("Failed to broadcast status update for user %d: %v", userID, err)
	} else {
		log.Printf("Successfully broadcast status update for user %d", userID)
	}
}

func (pm *PresenceManager) IsUserOnline(userID int) bool {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	presence, exists := pm.users[userID]
	return exists && presence.Status != StatusOffline
}

func (pm *PresenceManager) GetUserStatus(userID int) *UserPresence {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	if presence, exists := pm.users[userID]; exists {
		return &UserPresence{
			UserID:       presence.UserID,
			Username:     presence.Username,
			Status:       presence.Status,
			Activity:     presence.Activity,
			LastActivity: presence.LastActivity,
			ConnectedAt:  presence.ConnectedAt,
		}
	}
	return nil
}

func (pm *PresenceManager) GetOnlineUsers() []UserPresence {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	users := make([]UserPresence, 0, len(pm.users))
	for _, presence := range pm.users {
		if presence.Status != StatusOffline {
			users = append(users, *presence)
		}
	}
	return users
}

func (pm *PresenceManager) createStatusUpdateFromPresence(presence *UserPresence) StatusUpdate {
	statusUpdate := StatusUpdate{
		Type: "status_update",
	}
	statusUpdate.Data.UserID = presence.UserID
	statusUpdate.Data.Username = presence.Username
	statusUpdate.Data.Status = presence.Status
	statusUpdate.Data.Activity = presence.Activity
	statusUpdate.Data.Timestamp = time.Now().Unix()
	statusUpdate.Data.Data = presence.CustomData

	return statusUpdate
}

func (pm *PresenceManager) createStatusUpdateFromDB(friend FriendStatusInfo) StatusUpdate {
	statusUpdate := StatusUpdate{
		Type: "status_update",
	}
	statusUpdate.Data.UserID = friend.UserID
	statusUpdate.Data.Username = friend.Username
	statusUpdate.Data.Status = friend.Status
	statusUpdate.Data.Activity = friend.Activity
	statusUpdate.Data.Timestamp = friend.LastSeen.Unix()
	statusUpdate.Data.Data = nil

	return statusUpdate
}
