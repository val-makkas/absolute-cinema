package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"zync-stream/middleware"
	"zync-stream/rooms"
	"zync-stream/ws"
)

func SetupRoomRoutes(router *gin.Engine, dbPool *pgxpool.Pool, redisClient *redis.Client) {
	roomRepo := rooms.NewRoomRepository(dbPool)
	roomHandlers := rooms.NewRoomHandlers(roomRepo, redisClient)

	roomGroup := router.Group("/api/rooms")
	roomGroup.Use(middleware.AuthMiddleware())
	{
		roomGroup.GET("", roomHandlers.GetRooms)
		roomGroup.POST("", roomHandlers.CreateRoom)
		roomGroup.GET("/:id", roomHandlers.GetRoom)
		roomGroup.POST("/:id/invite", roomHandlers.InviteToRoom)
		roomGroup.POST("/:id/join", roomHandlers.JoinRoom)
		roomGroup.POST("/:id/leave", roomHandlers.LeaveRoom)
		roomGroup.POST("/:id/playback", roomHandlers.UpdatePlayback)
		roomGroup.GET("/:id/ws", ws.HandleRoomWebSocket)
	}

	inviteGroup := router.Group("/api/invitations")
	inviteGroup.Use(middleware.AuthMiddleware())
	{
		inviteGroup.GET("", roomHandlers.GetInvitations)
		inviteGroup.POST("/:id/respond", roomHandlers.RespondToInvitation)
	}

	router.GET("/api/notifications/ws", middleware.AuthMiddleware(), ws.HandleNotificationsWS)
}
