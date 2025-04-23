package main

import (
	"fmt"
	"net/http"

	"stremio-watchparty/proxy"
	"stremio-watchparty/ws"
)

func main() {
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
