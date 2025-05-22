package rooms

import (
	"time"
)

const (
	// Room status constants
	RoomStatusActive   = "active"
	RoomStatusInactive = "inactive"
	RoomStatusDeleted  = "deleted"

	// Member role constants
	RoleOwner  = "owner"
	RoleAdmin  = "admin"
	RoleMember = "member"

	// Invitation status
	InviteStatusPending  = "pending"
	InviteStatusAccepted = "accepted"
	InviteStatusRejected = "rejected"
)

// Room represents a watch room
type Room struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	OwnerID     int       `json:"owner_id"`
	IsPrivate   bool      `json:"is_private"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// RoomMember represents a member of a room
type RoomMember struct {
	RoomID    int       `json:"room_id"`
	UserID    int       `json:"user_id"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`
	Username  string    `json:"username,omitempty"`
	AvatarURL string    `json:"avatar_url,omitempty"`
}

// PlaybackState represents the current state of media playback
type PlaybackState struct {
	RoomID          int       `json:"room_id"`
	MediaURL        string    `json:"media_url"`
	CurrentPosition float64   `json:"position"`
	IsPlaying       bool      `json:"is_playing"`
	PlaybackRate    float64   `json:"playback_rate"`
	UpdatedBy       int       `json:"updated_by"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Viewer represents a user currently viewing a room
type Viewer struct {
	UserID    int    `json:"user_id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

// RoomInvitation represents an invitation to join a room
type RoomInvitation struct {
	ID          int       `json:"id"`
	RoomID      int       `json:"room_id"`
	InvitedBy   int       `json:"invited_by"`
	InvitedUser int       `json:"invited_user"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
