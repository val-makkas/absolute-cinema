package main

import (
	"fmt"
	"net/http"

	"stremio-watchparty/ws"
)

// Message structure for chat and user-related messages.

func main() {
	// Handle WebSocket connections
	http.HandleFunc("/ws", ws.HandleConnection)

	// Start the WebSocket server
	fmt.Println("Server started on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}
