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
		roomGroup.POST("", roomHandlers.CreateRoom)
		roomGroup.GET("/:id", roomHandlers.GetRoom)
		roomGroup.GET("/:id/members", roomHandlers.GetMembers)
		roomGroup.PUT("/:id", roomHandlers.UpdateRoom)
		roomGroup.DELETE("/:id", roomHandlers.DeleteRoom)
	}

	inviteGroup := router.Group("/api/invitations")
	inviteGroup.Use(middleware.AuthMiddleware())
	{
		inviteGroup.GET("", roomHandlers.GetInvitations)
	}

	router.GET("/api/ws", ws.HandleMasterWebSocket)
}
