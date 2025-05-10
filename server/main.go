package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"absolute-cinema/proxy"
	"absolute-cinema/users"
	"absolute-cinema/ws"
)

func main() {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://localhost:5173"},
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

	http.Handle("/api/metadata/", proxy.NewMetadataProxy(
		"/api/metadata",                // the prefix to strip
		"http://metadata-service:8000", // the Docker service + port
	))

	http.HandleFunc("/ws", ws.HandleConnection)

	// Mount Gin as the default handler for everything else
	http.Handle("/", r)

	fmt.Println("Server started on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}
