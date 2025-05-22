package users

import (
	"net/http"
	"os"
	"strings"
	"time"
	"zync-stream/db"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte(os.Getenv("JWT_SECRET"))

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type Claims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func GenerateJWT(user User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Connection Failed"})
		return
	}

	userRepo := NewUserRepo(dbPool)

	existingUser, err := userRepo.GetByUsername(c.Request.Context(), req.Username)
	if err != nil && err != pgx.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Username already exists"})
		return
	}

	existingUser, err = userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err != nil && err != pgx.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Email already exists"})
		return
	}

	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)

	user := &User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashed),
		Extensions:   []string{},
	}

	err = userRepo.Create(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB connection failed"})
		return
	}
	UserRepo := NewUserRepo(dbPool)

	user, err := UserRepo.GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	_ = UserRepo.UpdateLastLogin(c.Request.Context(), user.ID)

	tokenString, err := GenerateJWT(*user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      tokenString,
		"username":   user.Username,
		"extensions": user.Extensions,
	})
}

func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing or wrong token."})
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token."})
			return
		}
		claims := token.Claims.(jwt.MapClaims)
		c.Set("username", claims["username"])
		c.Set("user_id", int(claims["user_id"].(float64)))
		c.Next()
	}
}

func GetExtensions(c *gin.Context) {
	userID, _ := c.Get("user_id")

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB connection failed"})
		return
	}
	UserRepo := NewUserRepo(dbPool)

	user, err := UserRepo.GetByID(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"extensions": user.Extensions})
}

func SetExtensions(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		Extensions []string `json:"extensions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Connection Failed"})
		return
	}

	userRepo := NewUserRepo(dbPool)

	err = userRepo.UpdateExtensions(c.Request.Context(), userID.(int), req.Extensions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update extensions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Extensions updated"})
}

func GetMe(c *gin.Context) {
	userID, _ := c.Get("user_id")

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Connection Failed"})
		return
	}

	userRepo := NewUserRepo(dbPool)

	user, err := userRepo.GetByID(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"email":      user.Email,
		"extensions": user.Extensions,
	})
}
