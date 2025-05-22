package users

import (
	"time"
)

type User struct {
	ID                int        `json:"id"`
	Username          string     `json:"username"`
	Email             string     `json:"email"`
	PasswordHash      string     `json:"-"`
	DisplayName       string     `json:"display_name,omitempty"`
	ProfilePictureURL string     `json:"profile_picture_url,omitempty"`
	Bio               string     `json:"bio,omitempty"`
	Extensions        []string   `json:"extensions"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	LastLoginAt       *time.Time `json:"last_login_at,omitempty"`
}
