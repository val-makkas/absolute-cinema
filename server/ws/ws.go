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
		// change prod
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
