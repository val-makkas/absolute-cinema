package middleware

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func getJWTSecretKey() string {
	key := os.Getenv("JWT_SECRET_KEY")
	if key == "" {
		key = "my-development-secret-key-for-jwt-signing"
	}
	return key
}

// ValidateJWT validates a JWT token and returns claims - used by WebSocket
func ValidateJWT(tokenString string) (jwt.MapClaims, error) {
	// Remove "Bearer " prefix if present
	if strings.HasPrefix(tokenString, "Bearer ") {
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")
	}

	jwtKey := []byte(getJWTSecretKey())

	// Parse and validate token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtKey, nil
	})

	if err != nil {
		log.Printf("JWT Parse Error: %v", err)
		return nil, err
	}

	if !token.Valid {
		log.Printf("Invalid JWT token")
		return nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Printf("Invalid JWT claims format")
		return nil, errors.New("invalid token claims")
	}

	// Check expiration
	if exp, ok := claims["exp"].(float64); ok {
		if time.Now().Unix() > int64(exp) {
			log.Printf("JWT token expired")
			return nil, errors.New("token expired")
		}
	} else {
		log.Printf("JWT token missing expiration")
		return nil, errors.New("token missing expiration")
	}

	return claims, nil
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		log.Printf("Auth Header: '%s'", authHeader) // Debug log

		if authHeader == "" {
			log.Printf("Missing Authorization header")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check Bearer format
		if !strings.HasPrefix(authHeader, "Bearer ") {
			log.Printf("Invalid Authorization header format: %s", authHeader)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token format required"})
			c.Abort()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		log.Printf("Token: '%s'", tokenString[:min(len(tokenString), 20)]+"...") // Debug log (partial)

		// Validate token
		claims, err := ValidateJWT(tokenString)
		if err != nil {
			log.Printf("Token validation failed: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token: " + err.Error()})
			c.Abort()
			return
		}

		// Extract and set user info in context
		if userID, ok := claims["user_id"].(float64); ok {
			c.Set("user_id", int(userID))
			log.Printf("Set user_id: %d", int(userID)) // Debug log
		} else {
			log.Printf("Invalid user_id in token claims")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
			c.Abort()
			return
		}

		if username, ok := claims["username"].(string); ok {
			c.Set("username", username)
		}
		if email, ok := claims["email"].(string); ok {
			c.Set("email", email)
		}
		if displayName, ok := claims["display_name"].(string); ok {
			c.Set("display_name", displayName)
		}

		log.Printf("Auth successful for user: %v", claims["username"])
		c.Next()
	}
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
