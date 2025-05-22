package users

import (
	"time"
)

type User struct {
	ID                int       `json:"id"`
	Username          string    `json:"username"`
	Email             string    `json:"email"`
	PasswordHash      string    `json:"-"`
	DisplayName       string    `json:"display_name,omitempty"`
	ProfilePictureURL string    `json:"profile_picture_url,omitempty"`
	Bio               string    `json:"bio,omitempty"`
	Extensions        []string  `json:"extensions"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	LastLoginAt       time.Time `json:"last_login_at,omitempty"`
}

type WatchHistoryEntry struct {
	ID                int       `json:"id"`
	UserID            int       `json:"user_id"`
	ImdbID            string    `json:"imdb_id"`
	MediaType         string    `json:"media_type"` // "movie" or "series"
	SeasonNumber      *int      `json:"season_number,omitempty"`
	EpisodeNumber     *int      `json:"episode_number,omitempty"`
	TimestampSeconds  int       `json:"timestamp_seconds"`
	DurationSeconds   int       `json:"duration_seconds,omitempty"`
	PercentageWatched float64   `json:"percentage_watched"`
	LastWatched       time.Time `json:"last_watched"`
}

type WatchHistoryRequest struct {
	ImdbID            string  `json:"imdb_id" binding:"required"`
	MediaType         string  `json:"media_type" binding:"required,oneof=movie series"`
	SeasonNumber      *int    `json:"season_number,omitempty"`
	EpisodeNumber     *int    `json:"episode_number,omitempty"`
	EpisodeTitle      string  `json:"episode_title,omitempty"`
	TimestampSeconds  int     `json:"timestamp_seconds" binding:"required,min=0"`
	DurationSeconds   int     `json:"duration_seconds,omitempty"`
	PercentageWatched float64 `json:"percentage_watched" binding:"required,min=0,max=100"`
}
