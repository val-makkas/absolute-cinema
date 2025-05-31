package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"zync-stream/db"
	"zync-stream/routes"
	"zync-stream/ws"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	if os.Getenv("JWT_SECRET_KEY") == "" {
		os.Setenv("JWT_SECRET_KEY", "my-development-secret-key-for-jwt-signing")
		log.Println("warning: default jwt secret")
	}

	postgresURL := os.Getenv("DATABASE_URL")
	if postgresURL == "" {
		postgresURL = "postgres://postgres:postgres@localhost:5432/zync_stream"
		log.Println("warning: default db url")
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
		log.Println("warning: default redis url")
	}

	os.Setenv("DB_URL", postgresURL)

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	defer db.ClosePostgresClient()

	err = db.InitRedisClient(redisURL)
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v", err)
		log.Println("Real-time features will be disabled")
	}
	defer db.CloseRedisClient()

	redisClient, err := db.GetRedisClient()
	if err != nil {
		log.Fatal("Failed to get Redis client:", err)
	}

	ws.InitRedis(redisClient)

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "https://localhost:5173", "http://localhost:5174", "https://localhost:5174"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	userRepo := routes.SetupUserRoutes(router, dbPool, redisClient)
	ws.InitPresenceManager(userRepo)
	routes.SetupRoomRoutes(router, dbPool, redisClient)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	go func() {
		log.Printf("Server starting on port %s...", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server shutdown complete")
}
