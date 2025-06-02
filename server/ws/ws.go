package ws

import (
	"fmt"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000" ||
			origin == "http://localhost:5173" ||
			origin == "https://localhost:5173" ||
			origin == "http://localhost:5174" ||
			origin == "https://localhost:5174" ||
			origin == "app://-"
	},
}

var redisClient *redis.Client

func InitRedis(client *redis.Client) {
	redisClient = client
}

func GetRedisClient() (*redis.Client, error) {
	if redisClient == nil {
		return nil, fmt.Errorf("redis client not initialized")
	}
	return redisClient, nil
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
