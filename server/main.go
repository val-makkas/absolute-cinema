package main

import (
	"fmt"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"zync-stream/users"
	"zync-stream/ws"
)

func main() {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://localhost:5173", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/api/users/google/login", users.GoogleLogin)
	r.GET("/api/users/google/callback", users.GoogleCallback)
	r.POST("/api/users/register", users.Register)
	r.POST("/api/users/login", users.Login)

	auth := r.Group("/api/users")
	auth.Use(users.JWTAuth())
	auth.GET("/extensions", users.GetExtensions)
	auth.POST("/extensions", users.SetExtensions)

	ws.InitRedis("redis:6379")

	r.GET("/ws", func(c *gin.Context) {
		ws.HandleConnection(c.Writer, c.Request)
	})

	fmt.Println("Server started on :8080")
	err := r.Run(":8080")
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}
