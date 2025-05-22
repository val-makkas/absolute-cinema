package friendships

import (
	"net/http"
	"strconv"
	"zync-stream/db"

	"github.com/gin-gonic/gin"
)

func GetFriendships(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	status := c.Query("status")
	if status != "" && status != StatusAccepted && status != StatusPending && status != StatusBlocked && status != StatusRejected {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status parameter"})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	repo := NewFriendshipRepository(dbPool)
	friendships, err := repo.GetFriendships(c.Request.Context(), userID.(int), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve friendships"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"friendships": friendships})
}

func GetFriendshipRequests(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	repo := NewFriendshipRepository(dbPool)
	requests, err := repo.GetFriendshipRequests(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve friendship requests"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

func RequestFriendship(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	friendIDStr := c.Param("id")
	friendID, err := strconv.Atoi(friendIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if userID.(int) == friendID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot send a friend request to yourself"})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	repo := NewFriendshipRepository(dbPool)
	err = repo.RequestFriendship(c.Request.Context(), userID.(int), friendID)
	if err != nil {
		if err.Error() == "friendship already exists" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Friendship already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create friendship request"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Friendship request sent"})
}

func AcceptFriendship(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	friendIDStr := c.Param("id")
	friendID, err := strconv.Atoi(friendIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	repo := NewFriendshipRepository(dbPool)
	err = repo.AcceptFriendship(c.Request.Context(), userID.(int), friendID)
	if err != nil {
		if err.Error() == "friendship request not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Friendship request not found"})
			return
		}
		if err.Error() == "friendship is not in pending state" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Friendship is not in pending state"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept friendship"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friendship accepted"})
}

func RejectFriendship(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	friendIDStr := c.Param("id")
	friendID, err := strconv.Atoi(friendIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	repo := NewFriendshipRepository(dbPool)
	err = repo.RejectFriendship(c.Request.Context(), userID.(int), friendID)
	if err != nil {
		if err.Error() == "friendship request not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Friendship request not found"})
			return
		}
		if err.Error() == "friendship is not in pending state" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Friendship is not in pending state"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject friendship"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friendship rejected"})
}

func BlockUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	blockedIDStr := c.Param("id")
	blockedID, err := strconv.Atoi(blockedIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if userID.(int) == blockedID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot block yourself"})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	repo := NewFriendshipRepository(dbPool)
	err = repo.BlockUser(c.Request.Context(), userID.(int), blockedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to block user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User blocked"})
}

func RemoveFriendship(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	friendIDStr := c.Param("id")
	friendID, err := strconv.Atoi(friendIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	dbPool, err := db.GetPostgresClient()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection failed"})
		return
	}

	repo := NewFriendshipRepository(dbPool)
	err = repo.RemoveFriendship(c.Request.Context(), userID.(int), friendID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove friendship"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friendship removed"})
}
