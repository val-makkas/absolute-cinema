package rooms

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RoomHandlers handles HTTP requests related to rooms
type RoomHandlers struct {
	repo         *RoomRepository
	stateManager *RoomStateManager
}

// NewRoomHandlers creates a new RoomHandlers
func NewRoomHandlers(repo *RoomRepository, redis *redis.Client) *RoomHandlers {
	return &RoomHandlers{
		repo:         repo,
		stateManager: NewRoomStateManager(redis),
	}
}

// GetRooms handles GET /api/rooms
func (h *RoomHandlers) GetRooms(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limit := 20
	offset := 0

	if limitParam := c.Query("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetParam := c.Query("offset"); offsetParam != "" {
		if parsedOffset, err := strconv.Atoi(offsetParam); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	rooms, err := h.repo.GetRooms(c.Request.Context(), userID.(int), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve rooms"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rooms": rooms})
}

// CreateRoom handles POST /api/rooms
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

	if err := h.repo.Create(c.Request.Context(), room); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create room"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Room created successfully",
		"room":    room,
	})
}

// GetRoom handles GET /api/rooms/:id
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

	var playbackState *PlaybackState
	var viewers []Viewer

	playbackState, _ = h.stateManager.GetPlaybackState(c.Request.Context(), roomID)
	viewers, _ = h.stateManager.GetViewers(c.Request.Context(), roomID)

	username := c.GetString("username")
	avatarURL := c.GetString("avatar_url")
	h.stateManager.AddViewer(c.Request.Context(), roomID, userID.(int), username, avatarURL)

	isMember, role, _ := h.repo.IsRoomMember(c.Request.Context(), roomID, userID.(int))

	c.JSON(http.StatusOK, gin.H{
		"room":      room,
		"members":   members,
		"state":     playbackState,
		"viewers":   viewers,
		"is_member": isMember,
		"user_role": role,
	})
}

// InviteToRoom handles POST /api/rooms/:id/invite
func (h *RoomHandlers) InviteToRoom(c *gin.Context) {
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
		Username string `json:"username" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from username
	var invitedUserID int
	err = h.repo.db.QueryRow(c.Request.Context(),
		"SELECT id FROM users WHERE username = $1", req.Username).Scan(&invitedUserID)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	invitationID, err := h.repo.InviteToRoom(
		c.Request.Context(),
		roomID,
		userID.(int),
		invitedUserID,
		h.stateManager.redis)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invitation: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Invitation sent successfully",
		"invitation_id": invitationID,
	})
}

// GetInvitations handles GET /api/invitations
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

// RespondToInvitation handles POST /api/invitations/:id/respond
func (h *RoomHandlers) RespondToInvitation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	invitationIDStr := c.Param("id")
	invitationID, err := strconv.Atoi(invitationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invitation ID"})
		return
	}

	var req struct {
		Accept bool `json:"accept" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.repo.RespondToInvitation(
		c.Request.Context(),
		invitationID,
		userID.(int),
		req.Accept,
		h.stateManager.redis)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process invitation: " + err.Error()})
		return
	}

	message := "Invitation rejected"
	if req.Accept {
		message = "Invitation accepted. You are now a member of the room."
	}

	c.JSON(http.StatusOK, gin.H{"message": message})
}

// JoinRoom handles POST /api/rooms/:id/join
func (h *RoomHandlers) JoinRoom(c *gin.Context) {
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

	err = h.repo.AddMember(c.Request.Context(), roomID, userID.(int), RoleMember)
	if err != nil {
		if err.Error() == "user is already a member of this room" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You are already a member of this room"})
		} else if err.Error() == "invitation required for private room" {
			c.JSON(http.StatusForbidden, gin.H{"error": "This is a private room. You need an invitation to join."})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join room"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully joined room"})
}

// LeaveRoom handles POST /api/rooms/:id/leave
func (h *RoomHandlers) LeaveRoom(c *gin.Context) {
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

	if room.OwnerID == userID.(int) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room owner cannot leave. Transfer ownership first or delete the room."})
		return
	}

	err = h.repo.RemoveMember(c.Request.Context(), roomID, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave room"})
		return
	}

	h.stateManager.RemoveViewer(c.Request.Context(), roomID, userID.(int))

	c.JSON(http.StatusOK, gin.H{"message": "Successfully left room"})
}

// UpdatePlayback handles POST /api/rooms/:id/playback
func (h *RoomHandlers) UpdatePlayback(c *gin.Context) {
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
		MediaURL        string  `json:"media_url"`
		CurrentPosition float64 `json:"position"`
		IsPlaying       bool    `json:"is_playing"`
		PlaybackRate    float64 `json:"playback_rate"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	isMember, _, err := h.repo.IsRoomMember(c.Request.Context(), roomID, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check membership"})
		return
	}

	if !isMember {
		c.JSON(http.StatusForbidden, gin.H{"error": "You must be a member to update playback"})
		return
	}

	playbackState := &PlaybackState{
		RoomID:          roomID,
		MediaURL:        req.MediaURL,
		CurrentPosition: req.CurrentPosition,
		IsPlaying:       req.IsPlaying,
		PlaybackRate:    req.PlaybackRate,
		UpdatedBy:       userID.(int),
	}

	if playbackState.PlaybackRate <= 0 {
		playbackState.PlaybackRate = 1.0
	}

	if err := h.stateManager.UpdatePlaybackState(c.Request.Context(), playbackState); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update playback state"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Playback state updated",
		"state":   playbackState,
	})
}
