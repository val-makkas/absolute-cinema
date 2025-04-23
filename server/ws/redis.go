package ws

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// Global variables
var (
	RedisClient *redis.Client
	redisCtx    = context.Background()
)

// InitRedis πρέπει να κληθεί μια φορά στο main()
func InitRedis(addr string) {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: "",
		DB:       0,
	})
	if _, err := RedisClient.Ping(redisCtx).Result(); err != nil {
		panic(fmt.Sprintf("Cannot connect to Redis: %v", err))
	}
	fmt.Println("🔌 Connected to Redis at", addr)
}

// SaveMessage αποθηκεύει το msg στη λίστα "room:<roomID>:msgs"
func SaveMessage(roomID string, msg Message) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	key := roomKey(roomID)
	if err := RedisClient.RPush(redisCtx, key, data).Err(); err != nil {
		return err
	}
	// Προαιρετικά: κρατάμε μόνο τα τελευταία 100 μηνύματα
	RedisClient.LTrim(redisCtx, key, -100, -1)
	fmt.Printf("🔴 Saved to Redis key=%s msg=%+v\n", key, msg)
	return nil
}

// GetMessages ανακτά όλα τα μηνύματα από το room
func GetMessages(roomID string) ([]Message, error) {
	key := roomKey(roomID)
	vals, err := RedisClient.LRange(redisCtx, key, 0, -1).Result()
	if err != nil {
		return nil, err
	}
	var out []Message
	for _, v := range vals {
		var m Message
		if err := json.Unmarshal([]byte(v), &m); err == nil {
			out = append(out, m)
		}
	}
	fmt.Printf("🟢 Loaded %d messages from Redis key=%s\n", len(out), key)
	return out, nil
}

// Βοηθητική για consistent key naming
func roomKey(roomID string) string {
	return fmt.Sprintf("room:%s:msgs", roomID)
}
