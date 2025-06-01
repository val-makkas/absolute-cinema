package rooms

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type RoomHandlers struct {
	repo *RoomRepository
}

func NewRoomHandlers(repo *RoomRepository, redis *redis.Client) *RoomHandlers {
	return &RoomHandlers{
		repo: repo,
	}
}

func (h *RoomHandlers) CreateRoom(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		IsPrivate   bool   `json:"is_private"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room := &Room{
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     userID.(int),
		IsPrivate:   req.IsPrivate,
		Status:      RoomStatusActive,
	}

	log.Printf("Creating room: %+v", room)

	if err := h.repo.Create(c.Request.Context(), room); err != nil {
		log.Printf("Failed to create room: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create room"})
		return
	}

	log.Printf("Room created successfully: ID=%d", room.ID)

	c.JSON(http.StatusCreated, gin.H{
		"room": room,
	})
}

func (h *RoomHandlers) GetRoom(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	roomIDStr := c.Param("id")
	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
		return
	}

	room, err := h.repo.GetByID(c.Request.Context(), roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve room"})
		return
	}

	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	// Check access for private rooms
	if room.IsPrivate {
		isMember, _, err := h.repo.IsRoomMember(c.Request.Context(), roomID, userID.(int))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check membership"})
			return
		}

		if !isMember {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this room"})
			return
		}
	}

	members, err := h.repo.GetRoomMembers(c.Request.Context(), roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve room members"})
		return
	}

	isMember, role, _ := h.repo.IsRoomMember(c.Request.Context(), roomID, userID.(int))

	c.JSON(http.StatusOK, gin.H{
		"room":      room,
		"members":   members,
		"is_member": isMember,
		"user_role": role,
	})
}

func (h *RoomHandlers) GetMembers(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	roomIDStr := c.Param("id")
	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
		return
	}

	isMember, _, err := h.repo.IsRoomMember(c.Request.Context(), roomID, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check membership"})
		return
	}

	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this room"})
		return
	}

	members, err := h.repo.GetRoomMembers(c.Request.Context(), roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve room members"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"members": members})
}

func (h *RoomHandlers) UpdateRoom(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	roomIDStr := c.Param("id")
	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		IsPrivate   *bool  `json:"is_private"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user is owner
	room, err := h.repo.GetByID(c.Request.Context(), roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve room"})
		return
	}

	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	if room.OwnerID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only room owner can update room settings"})
		return
	}

	if req.Name != "" {
		room.Name = req.Name
	}
	if req.Description != "" {
		room.Description = req.Description
	}
	if req.IsPrivate != nil {
		room.IsPrivate = *req.IsPrivate
	}

	if err := h.repo.Update(c.Request.Context(), room); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update room"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Room updated successfully",
		"room":    room,
	})
}

func (h *RoomHandlers) DeleteRoom(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	roomIDStr := c.Param("id")
	roomID, err := strconv.Atoi(roomIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
		return
	}

	room, err := h.repo.GetByID(c.Request.Context(), roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve room"})
		return
	}

	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	if room.OwnerID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only room owner can delete room"})
		return
	}

	if err := h.repo.Delete(c.Request.Context(), roomID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete room"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Room deleted successfully"})
}

func (h *RoomHandlers) GetInvitations(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	invitations, err := h.repo.GetInvitations(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve invitations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"invitations": invitations})
}
