package main

import (
	"fmt"
	"net/http"

	"stremio-watchparty/ws"
)

// Message structure for chat and user-related messages.

func main() {
	ws.InitRedis("redis:6379")

	http.HandleFunc("/ws", ws.HandleConnection)
	fmt.Println("Server started on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}
