package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"zync-stream/middleware"
	"zync-stream/users"
)

func SetupUserRoutes(router *gin.Engine, dbPool *pgxpool.Pool, redisClient *redis.Client) {
	userRepo := users.NewUserRepo(dbPool)
	userHandlers := users.NewHandlers(userRepo, redisClient)

	// no auth required
	publicGroup := router.Group("/api/users")
	{
		publicGroup.POST("/register", userHandlers.Register)
		publicGroup.POST("/login", userHandlers.Login)

		// publicGroup.GET("/google/login", userHandlers.GoogleLogin)
		// publicGroup.GET("/google/callback", userHandlers.GoogleCallback)
		// publicGroup.POST("/forgot-password", userHandlers.ForgotPassword)
	}

	// require auth
	authGroup := router.Group("/api/users")
	authGroup.Use(middleware.AuthMiddleware())
	{
		authGroup.GET("/me", userHandlers.GetMe)
		authGroup.PUT("/me/password", userHandlers.ChangePassword)
		authGroup.POST("/me/extensions", userHandlers.UpdateExtensions)
		authGroup.PUT("/me/avatar", userHandlers.UpdateAvatar)
		authGroup.GET("/me/watch-history", userHandlers.GetWatchHistory)
		authGroup.POST("/me/watch-history", userHandlers.UpdateWatchHistory)
		authGroup.GET("/me/watch-history/:imdb_id", userHandlers.GetWatchHistoryItem)
		authGroup.PUT("/status", userHandlers.UpdateStatus)
		authGroup.GET("/search", userHandlers.SearchUsers)
	}

	// friend routes
	friendGroup := router.Group("/api/friends")
	friendGroup.Use(middleware.AuthMiddleware())
	{
		friendGroup.GET("", userHandlers.GetFriends)
		friendGroup.POST("", userHandlers.SendFriendRequest)
		friendGroup.GET("/requests", userHandlers.GetFriendRequests)
		friendGroup.POST("/requests/:id/accept", userHandlers.AcceptFriendRequest)
		friendGroup.POST("/requests/:id/reject", userHandlers.RejectFriendRequest)
		friendGroup.DELETE("/:id", userHandlers.RemoveFriend)
	}
}
