package ws

import (
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		//change
		return true
	},
}

var redisClient *redis.Client

func InitRedis(client *redis.Client) {
	redisClient = client
}

func GetRedisClient() (*redis.Client, error) {
	if redisClient == nil {
		return nil, http.ErrNoCookie
	}
	return redisClient, nil
}
