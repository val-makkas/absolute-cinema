package ws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

type NotificationHandler struct {
	userID   int
	username string
	send     chan []byte
	done     chan struct{}
}

func NewNotificationHandler(userID int, username string, send chan []byte, done chan struct{}) *NotificationHandler {
	return &NotificationHandler{
		userID:   userID,
		username: username,
		send:     send,
		done:     done,
	}
}

func (nh *NotificationHandler) Subscribe() {
	go nh.subscribeToNotifications()
}

func (nh *NotificationHandler) subscribeToNotifications() {
	redisClient, err := GetRedisClient()
	if err != nil {
		log.Printf("Failed to get Redis client: %v", err)
		return
	}

	notificationChannel := fmt.Sprintf("user:%d:notifications", nh.userID)
	pubsub := redisClient.Subscribe(context.Background(), notificationChannel)
	defer pubsub.Close()

	log.Printf("User %d subscribed to notifications", nh.userID)

	for {
		select {
		case <-nh.done:
			return
		default:
			msg, err := pubsub.ReceiveMessage(context.Background())
			if err != nil {
				log.Printf("Error receiving notification: %v", err)
				return
			}

			select {
			case nh.send <- []byte(msg.Payload):
			case <-nh.done:
				return
			default:
				log.Printf("Notification buffer full for user %d, dropping message", nh.userID)
			}
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

	log.Printf("Sent %s notification to user %d", notificationType, userID)
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

func SendStatusUpdate(userID int, status, activity string, customData map[string]interface{}) error {
	redisClient, err := GetRedisClient()
	if err != nil {
		return fmt.Errorf("failed to get Redis client: %v", err)
	}

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

	log.Printf("Broadcasting status update for user %d: %s", userID, status)

	ctx := context.Background()
	friendIDs, err := presenceManager.userRepo.GetUserFriends(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get friends: %v", err)
	}

	log.Printf("Sending status update to %d friends", len(friendIDs))

	sentCount := 0
	for _, friendID := range friendIDs {
		userChannel := fmt.Sprintf("user:%d:notifications", friendID)
		err = redisClient.Publish(context.Background(), userChannel, statusJSON).Err()
		if err != nil {
			log.Printf("Failed to send status update to friend %d: %v", friendID, err)
		} else {
			sentCount++
		}
	}

	log.Printf("Status update sent to %d/%d friends via Redis", sentCount, len(friendIDs))
	return nil
}
