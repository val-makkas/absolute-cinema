package middleware

import (
	"zync-stream/users"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return users.JWTAuth()
}
