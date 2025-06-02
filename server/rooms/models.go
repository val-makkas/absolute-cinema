package rooms

import (
	"time"
)

const (
	RoomStatusActive   = "active"
	RoomStatusInactive = "inactive"
	RoomStatusDeleted  = "deleted"

	RoleOwner  = "owner"
	RoleAdmin  = "admin"
	RoleMember = "member"

	InviteStatusPending  = "pending"
	InviteStatusAccepted = "accepted"
	InviteStatusRejected = "rejected"
)

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

type RoomMember struct {
	RoomID      int       `json:"room_id"`
	UserID      int       `json:"user_id"`
	Role        string    `json:"role"`
	JoinedAt    time.Time `json:"joined_at"`
	Username    string    `json:"username,omitempty"`
	DisplayName string    `json:"display_name,omitempty"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
}

type PlaybackState struct {
	RoomID          int       `json:"room_id"`
	MediaURL        string    `json:"media_url"`
	CurrentPosition float64   `json:"position"`
	IsPlaying       bool      `json:"is_playing"`
	PlaybackRate    float64   `json:"playback_rate"`
	UpdatedBy       int       `json:"updated_by"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Viewer struct {
	UserID    int    `json:"user_id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

type RoomInvitation struct {
	ID                 int       `json:"id"`
	RoomID             int       `json:"room_id"`
	InviterID          int       `json:"inviter_id"`
	InviteeID          int       `json:"invitee_id"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
	RoomName           string    `json:"room_name"`
	RoomDescription    string    `json:"room_description"`
	InviterDisplayName string    `json:"inviter_display_name"`
	InviterUsername    string    `json:"inviter_username"`
}
