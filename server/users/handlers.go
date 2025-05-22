package users

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

// UserHandlers contains all user HTTP handlers with dependency injection
type UserHandlers struct {
	repo  *UserRepo
	redis *redis.Client
}

// NewHandlers creates a new UserHandlers instance
func NewHandlers(repo *UserRepo, redis *redis.Client) *UserHandlers {
	return &UserHandlers{
		repo:  repo,
		redis: redis,
	}
}

// Standard error response
func (h *UserHandlers) respondWithError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

func getJWTSecretKey() string {
	key := os.Getenv("JWT_SECRET_KEY")
	if key == "" {
		// Development fallback - DO NOT use this in production!
		key = "my-development-secret-key-for-jwt-signing"
	}
	return key
}

var jwtKey = []byte(getJWTSecretKey())

func GenerateJWT(user *User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token format required"})
			c.Abort()
			return
		}

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("invalid token signing method")
			}
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Set user info in context
		userID := int(claims["user_id"].(float64))
		username := claims["username"].(string)
		c.Set("user_id", userID)
		c.Set("username", username)

		// Try to extract avatar URL if available
		if avatarURL, exists := claims["avatar_url"]; exists && avatarURL != nil {
			c.Set("avatar_url", avatarURL.(string))
		}

		c.Next()
	}
}

// Register handles user registration
func (h *UserHandlers) Register(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required,min=3,max=30"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	// Create timeout context
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Check if username already exists
	existingUser, err := h.repo.GetByUsername(ctx, req.Username)
	if err != nil {
		log.Printf("DATABASE ERROR: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Error checking username")
		return
	}

	if existingUser != nil {
		h.respondWithError(c, http.StatusConflict, "Username already exists")
		return
	}

	// Check if email already exists
	existingUser, err = h.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Error checking email")
		return
	}

	if existingUser != nil {
		h.respondWithError(c, http.StatusConflict, "Email already registered")
		return
	}

	// Create password hash
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Error processing password")
		return
	}

	user := &User{
		Username:          req.Username,
		Email:             req.Email,
		PasswordHash:      string(hashedPassword),
		DisplayName:       req.Username,
		ProfilePictureURL: "",
		Bio:               "",
		Extensions:        []string{},
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
		LastLoginAt:       time.Now(),
	}

	err = h.repo.Create(ctx, user)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Generate JWT
	token, err := GenerateJWT(user)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful",
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
		},
		"token": token,
	})
}

// Login handles user login
func (h *UserHandlers) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("DATABASE ERROR: %v", err)
		h.respondWithError(c, http.StatusBadRequest, "Invalid input")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.repo.GetByEmail(ctx, req.Email)
	if err != nil {
		log.Printf("DATABASE ERROR: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Error retrieving user")
		return
	}

	if user == nil {
		log.Printf("DATABASE ERROR: %v", err)
		h.respondWithError(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Check password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		log.Printf("DATABASE ERROR: %v", err)
		h.respondWithError(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Update last login
	h.repo.UpdateLastLogin(ctx, user.ID)

	// Generate JWT
	token, err := GenerateJWT(user)
	if err != nil {
		log.Printf("DATABASE ERROR: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user": gin.H{
			"id":              user.ID,
			"username":        user.Username,
			"display_name":    user.DisplayName,
			"profile_picture": user.ProfilePictureURL,
			"bio":             user.Bio,
		},
		"token": token,
	})
}

// GetMe retrieves the current user's info
func (h *UserHandlers) GetMe(c *gin.Context) {
	userID, _ := c.Get("user_id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.repo.GetByID(ctx, userID.(int))
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to retrieve user")
		return
	}

	if user == nil {
		h.respondWithError(c, http.StatusNotFound, "User not found")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":              user.ID,
		"username":        user.Username,
		"email":           user.Email,
		"display_name":    user.DisplayName,
		"profile_picture": user.ProfilePictureURL,
		"bio":             user.Bio,
		"extensions":      user.Extensions,
		"created_at":      user.CreatedAt,
		"last_login_at":   user.LastLoginAt,
	})
}

// ChangePassword handles changing a user's password
func (h *UserHandlers) ChangePassword(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.repo.GetByID(ctx, userID.(int))
	if err != nil || user == nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to retrieve user")
		return
	}

	// Verify old password
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)) != nil {
		h.respondWithError(c, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	// Hash new password
	hashedNew, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)

	// Update password
	err = h.repo.UpdatePassword(ctx, userID.(int), string(hashedNew))
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to update password")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

// UpdateAvatar handles uploading a new avatar
func (h *UserHandlers) UpdateAvatar(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		AvatarURL string `json:"avatar_url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.repo.UpdateAvatar(ctx, userID.(int), req.AvatarURL)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to update avatar")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Avatar updated successfully"})
}

func (h *UserHandlers) UpdateExtensions(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		h.respondWithError(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Extensions []string `json:"extensions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	if req.Extensions == nil {
		req.Extensions = []string{}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.repo.UpdateExtensions(ctx, userID.(int), req.Extensions)
	if err != nil {
		log.Printf("Error updating extensions: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Failed to update extensions")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Extensions updated successfully",
		"extensions": req.Extensions,
	})
}

func (h *UserHandlers) UpdateStatus(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		Status       string `json:"status" binding:"required"`
		CustomStatus string `json:"custom_status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request")
		return
	}

	validStatuses := map[string]bool{
		"online":  true,
		"away":    true,
		"busy":    true,
		"offline": true,
	}

	if !validStatuses[req.Status] {
		h.respondWithError(c, http.StatusBadRequest, "Invalid status. Must be online, away, busy, or offline")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.repo.UpdateStatus(ctx, userID.(int), req.Status, req.CustomStatus)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to update status")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        req.Status,
		"custom_status": req.CustomStatus,
	})

	// Publish status change to Redis if available
	if h.redis != nil {
		statusUpdate := map[string]interface{}{
			"type":          "status_update",
			"user_id":       userID.(int),
			"status":        req.Status,
			"custom_status": req.CustomStatus,
		}

		// This could be moved to a notification service
		username := c.GetString("username")
		if username != "" {
			statusUpdate["username"] = username
		}

		// We could publish this to friends' channels
	}
}

func (h *UserHandlers) UpdateWatchHistory(c *gin.Context) {
	// Get user ID from auth middleware
	userID, _ := c.Get("user_id")

	// Parse request body
	var req WatchHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	// For series, ensure season and episode are provided
	if req.MediaType == "series" && (req.SeasonNumber == nil || req.EpisodeNumber == nil) {
		h.respondWithError(c, http.StatusBadRequest, "Season and episode numbers are required for series")
		return
	}

	// Calculate percentage watched if not provided
	if req.PercentageWatched == 0 && req.DurationSeconds > 0 && req.TimestampSeconds > 0 {
		req.PercentageWatched = float64(req.TimestampSeconds) / float64(req.DurationSeconds) * 100
		if req.PercentageWatched > 100 {
			req.PercentageWatched = 100
		}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	entry, err := h.repo.UpdateWatchHistory(ctx, userID.(int), &req)
	if err != nil {
		log.Printf("Error updating watch history: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Failed to update watch history")
		return
	}

	c.JSON(http.StatusOK, entry)
}

func (h *UserHandlers) GetWatchHistory(c *gin.Context) {
	userID, _ := c.Get("user_id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	entries, err := h.repo.GetWatchHistory(ctx, userID.(int))
	if err != nil {
		log.Printf("Error retrieving watch history: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Failed to retrieve watch history")
		return
	}

	c.JSON(http.StatusOK, gin.H{"history": entries})
}

func (h *UserHandlers) GetWatchHistoryItem(c *gin.Context) {
	userID, _ := c.Get("user_id")
	imdbID := c.Param("imdb_id")

	var seasonNum, episodeNum *int
	seasonStr := c.Query("season")
	episodeStr := c.Query("episode")

	if seasonStr != "" {
		season, err := strconv.Atoi(seasonStr)
		if err == nil {
			seasonNum = &season
		}
	}

	if episodeStr != "" {
		episode, err := strconv.Atoi(episodeStr)
		if err == nil {
			episodeNum = &episode
		}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	entry, err := h.repo.GetWatchHistoryItem(ctx, userID.(int), imdbID, seasonNum, episodeNum)
	if err != nil {
		log.Printf("Error retrieving watch history item: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Failed to retrieve watch history item")
		return
	}

	if entry == nil {
		h.respondWithError(c, http.StatusNotFound, "No watch history found for this content")
		return
	}

	c.JSON(http.StatusOK, entry)
}

// SearchUsers handles searching for users
func (h *UserHandlers) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		h.respondWithError(c, http.StatusBadRequest, "Search query is required")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	users, err := h.repo.SearchUsers(ctx, query)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to search users")
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

// GetFriends handles getting a user's friends list
func (h *UserHandlers) GetFriends(c *gin.Context) {
	userID, _ := c.Get("user_id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	friends, err := h.repo.GetFriends(ctx, userID.(int))
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to get friends")
		return
	}

	c.JSON(http.StatusOK, gin.H{"friends": friends})
}

// SendFriendRequest handles sending a friend request
func (h *UserHandlers) SendFriendRequest(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		Username string `json:"username" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Find the target user
	targetUser, err := h.repo.GetByUsername(ctx, req.Username)
	if err != nil || targetUser == nil {
		h.respondWithError(c, http.StatusNotFound, "User not found")
		return
	}

	// Don't allow sending request to yourself
	if targetUser.ID == userID.(int) {
		h.respondWithError(c, http.StatusBadRequest, "Cannot send friend request to yourself")
		return
	}

	// Send friend request
	err = h.repo.SendFriendRequest(ctx, userID.(int), targetUser.ID)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			h.respondWithError(c, http.StatusBadRequest, "Friend request already sent or friendship already exists")
		} else {
			h.respondWithError(c, http.StatusInternalServerError, "Failed to send friend request")
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend request sent"})

	// Send notification via Redis if available
	if h.redis != nil {
		// This could be implemented to send a real-time notification
	}
}

// GetFriendRequests handles getting pending friend requests
func (h *UserHandlers) GetFriendRequests(c *gin.Context) {
	userID, _ := c.Get("user_id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	requests, err := h.repo.GetFriendRequests(ctx, userID.(int))
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to get friend requests")
		return
	}

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

// AcceptFriendRequest handles accepting a friend request
func (h *UserHandlers) AcceptFriendRequest(c *gin.Context) {
	userID, _ := c.Get("user_id")
	requestIDStr := c.Param("id")
	requestID, err := strconv.Atoi(requestIDStr)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request ID")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err = h.repo.RespondToFriendRequest(ctx, requestID, userID.(int), true)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to accept friend request")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend request accepted"})
}

// RejectFriendRequest handles rejecting a friend request
func (h *UserHandlers) RejectFriendRequest(c *gin.Context) {
	userID, _ := c.Get("user_id")
	requestIDStr := c.Param("id")
	requestID, err := strconv.Atoi(requestIDStr)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid request ID")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err = h.repo.RespondToFriendRequest(ctx, requestID, userID.(int), false)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to reject friend request")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend request rejected"})
}

// RemoveFriend handles removing a friend
func (h *UserHandlers) RemoveFriend(c *gin.Context) {
	userID, _ := c.Get("user_id")
	friendIDStr := c.Param("id")
	friendID, err := strconv.Atoi(friendIDStr)
	if err != nil {
		h.respondWithError(c, http.StatusBadRequest, "Invalid friend ID")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err = h.repo.RemoveFriend(ctx, userID.(int), friendID)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to remove friend")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend removed successfully"})
}
