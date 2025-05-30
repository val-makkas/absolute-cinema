package users

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
	"zync-stream/ws"

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

func GenerateJWT(user *User) (string, error) {
	// Use the same secret key function as middleware
	key := os.Getenv("JWT_SECRET_KEY")
	if key == "" {
		key = "my-development-secret-key-for-jwt-signing"
	}
	jwtKey := []byte(key)

	// Create claims
	claims := jwt.MapClaims{
		"user_id":      user.ID,
		"username":     user.Username,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"exp":          time.Now().Add(24 * time.Hour).Unix(),
		"iat":          time.Now().Unix(), // Add issued at time
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)

	if err != nil {
		log.Printf("Error signing JWT: %v", err)
		return "", err
	}

	log.Printf("Generated JWT for user %d (%s)", user.ID, user.Username)
	return tokenString, nil
}

// Register handles user registration
func (h *UserHandlers) Register(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required,min=3,max=30"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Binding Error: %v", err) // Fixed: was "DATABASE ERROR"
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
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		DisplayName:  req.Username,
		Extensions:   []string{},
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
		log.Printf("Binding Error: %v", err)
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
	var req struct {
		Username string `json:"username" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Friend request binding error: %v", err)
		log.Printf("Request body: %+v", req)
		h.respondWithError(c, http.StatusBadRequest, "Invalid input: "+err.Error())
		return
	}

	log.Printf("Processing friend request from user %d to username: %s",
		c.GetInt("user_id"), req.Username)

	// Get the current user ID from the JWT token
	senderID := c.GetInt("user_id")
	if senderID == 0 {
		log.Printf("No user_id found in context")
		h.respondWithError(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// Find the user to send request to
	targetUser, err := h.repo.GetByUsername(ctx, req.Username)
	if err != nil {
		log.Printf("Error finding target user '%s': %v", req.Username, err)
		h.respondWithError(c, http.StatusInternalServerError, "Error finding user")
		return
	}

	if targetUser == nil {
		log.Printf("Target user '%s' not found", req.Username)
		h.respondWithError(c, http.StatusNotFound, "User not found")
		return
	}

	if targetUser.ID == senderID {
		log.Printf("User %d tried to send friend request to themselves", senderID)
		h.respondWithError(c, http.StatusBadRequest, "Cannot send friend request to yourself")
		return
	}

	log.Printf("Sending friend request from user %d to user %d (%s)",
		senderID, targetUser.ID, targetUser.Username)

	// Check if friendship already exists
	existingFriend, err := h.repo.GetFriendship(ctx, senderID, targetUser.ID)
	if err != nil {
		log.Printf("Error checking existing friendship: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Error checking friendship")
		return
	}

	if existingFriend != nil {
		log.Printf("Friendship already exists between %d and %d", senderID, targetUser.ID)
		h.respondWithError(c, http.StatusConflict, "Already friends or request pending")
		return
	}

	// Create the friend request
	err = h.repo.SendFriendRequest(ctx, senderID, targetUser.ID)
	if err != nil {
		log.Printf("Error creating friend request: %v", err)
		h.respondWithError(c, http.StatusInternalServerError, "Failed to send friend request")
		return
	}

	log.Printf("✅ Friend request created successfully from %d to %d", senderID, targetUser.ID)

	// Send notification via Redis
	notificationData := map[string]interface{}{
		"sender_id":    senderID,
		"username":     h.getCurrentUsername(c),    // You'll need to implement this
		"display_name": h.getCurrentDisplayName(c), // You'll need to implement this
	}

	err = ws.SendNotification(targetUser.ID, "friend_request_received", notificationData)
	if err != nil {
		log.Printf("Error sending friend request notification: %v", err)
		// Don't fail the request, just log the error
	} else {
		log.Printf("✅ Friend request notification sent to user %d", targetUser.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Friend request sent successfully",
	})
}

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

	friendRequest, err := h.repo.GetFriendRequestByID(ctx, requestID)
	if err != nil || friendRequest == nil {
		h.respondWithError(c, http.StatusNotFound, "Friend request not found")
		return
	}

	// Verify this request is for the current user
	if friendRequest.ReceiverID != userID.(int) {
		h.respondWithError(c, http.StatusForbidden, "Not authorized to accept this request")
		return
	}

	err = h.repo.RespondToFriendRequest(ctx, requestID, userID.(int), true)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to accept friend request")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend request accepted"})

	accepterUser, err := h.repo.GetByID(ctx, userID.(int))
	if err == nil && accepterUser != nil {
		err = ws.SendFriendRequestAcceptedNotification(
			friendRequest.SenderID,
			accepterUser.ID,
			accepterUser.Username,
			accepterUser.DisplayName,
		)
		if err != nil {
			log.Printf("Failed to send friend request acceptance notification: %v", err)
		}
	}
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

	friendRequest, err := h.repo.GetFriendRequestByID(ctx, requestID)
	if err != nil || friendRequest == nil {
		h.respondWithError(c, http.StatusNotFound, "Friend request not found")
		return
	}

	if friendRequest.ReceiverID != userID.(int) {
		h.respondWithError(c, http.StatusForbidden, "Not authorized to reject this request")
		return
	}

	err = h.repo.RespondToFriendRequest(ctx, requestID, userID.(int), false)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to reject friend request")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend request rejected"})

	rejecterUser, err := h.repo.GetByID(ctx, userID.(int))
	if err == nil && rejecterUser != nil {
		err = ws.SendFriendRequestRejectedNotification(
			friendRequest.SenderID,
			rejecterUser.ID,
			rejecterUser.Username,
			rejecterUser.DisplayName,
		)
		if err != nil {
			log.Printf("Failed to send friend request rejection notification: %v", err)
		}
	}
}

// RemoveFriend handles removing a friend
func (h *UserHandlers) RemoveFriend(c *gin.Context) {
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

	// Dont allow sending request to yourself
	if targetUser.ID == userID.(int) {
		h.respondWithError(c, http.StatusBadRequest, "Cannot remove friend if it is yourself")
		return
	}

	err = h.repo.RemoveFriend(ctx, userID.(int), targetUser.ID)
	if err != nil {
		h.respondWithError(c, http.StatusInternalServerError, "Failed to remove friend")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friend removed successfully"})
}

func (h *UserHandlers) getCurrentUsername(c *gin.Context) string {
	if username, exists := c.Get("username"); exists {
		return username.(string)
	}
	return "Unknown"
}

func (h *UserHandlers) getCurrentDisplayName(c *gin.Context) string {
	if displayName, exists := c.Get("display_name"); exists {
		return displayName.(string)
	}
	return h.getCurrentUsername(c)
}
