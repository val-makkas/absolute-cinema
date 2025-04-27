package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"absolute-cinema/proxy"
	"absolute-cinema/users"
	"absolute-cinema/ws"
)

func main() {
	r := gin.Default()
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
	fmt.Println("Server started on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}
