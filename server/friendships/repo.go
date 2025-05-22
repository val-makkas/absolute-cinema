package friendships

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	StatusPending  = "pending"
	StatusAccepted = "accepted"
	StatusRejected = "rejected"
	StatusBlocked  = "blocked"
)

type Friendship struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	FriendID  int       `json:"friend_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type FriendshipRepository struct {
	db *pgxpool.Pool
}

func NewFriendshipRepository(db *pgxpool.Pool) *FriendshipRepository {
	return &FriendshipRepository{db: db}
}

func (r *FriendshipRepository) RequestFriendship(ctx context.Context, userID, friendID int) error {
	existing, err := r.GetFriendship(ctx, userID, friendID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	if existing != nil {
		return errors.New("friendship already exists")
	}

	query := `
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES ($1, $2, $3)
    `
	_, err = r.db.Exec(ctx, query, userID, friendID, StatusPending)
	return err
}

func (r *FriendshipRepository) AcceptFriendship(ctx context.Context, userID, friendID int) error {
	friendship, err := r.GetFriendship(ctx, friendID, userID)
	if err != nil {
		return err
	}

	if friendship == nil {
		return errors.New("friendship request not found")
	}

	if friendship.Status != StatusPending {
		return errors.New("friendship is not in pending state")
	}

	// Update the friendship status
	query := `
    UPDATE friendships
    SET status = $1, updated_at = NOW()
    WHERE user_id = $2 AND friend_id = $3
    `
	_, err = r.db.Exec(ctx, query, StatusAccepted, friendID, userID)
	return err
}

func (r *FriendshipRepository) RejectFriendship(ctx context.Context, userID, friendID int) error {
	friendship, err := r.GetFriendship(ctx, friendID, userID)
	if err != nil {
		return err
	}

	if friendship == nil {
		return errors.New("friendship request not found")
	}

	if friendship.Status != StatusPending {
		return errors.New("friendship is not in pending state")
	}

	query := `
    UPDATE friendships
    SET status = $1, updated_at = NOW()
    WHERE user_id = $2 AND friend_id = $3
    `
	_, err = r.db.Exec(ctx, query, StatusRejected, friendID, userID)
	return err
}

func (r *FriendshipRepository) BlockUser(ctx context.Context, userID, blockedID int) error {
	friendship, err := r.GetFriendship(ctx, userID, blockedID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	if friendship != nil {
		query := `
        UPDATE friendships
        SET status = $1, updated_at = NOW()
        WHERE user_id = $2 AND friend_id = $3
        `
		_, err = r.db.Exec(ctx, query, StatusBlocked, userID, blockedID)
		return err
	}

	query := `
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES ($1, $2, $3)
    `
	_, err = r.db.Exec(ctx, query, userID, blockedID, StatusBlocked)
	return err
}

func (r *FriendshipRepository) RemoveFriendship(ctx context.Context, userID, friendID int) error {
	query := `
    DELETE FROM friendships
    WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `
	_, err := r.db.Exec(ctx, query, userID, friendID)
	return err
}

func (r *FriendshipRepository) GetFriendship(ctx context.Context, userID, friendID int) (*Friendship, error) {
	query := `
    SELECT id, user_id, friend_id, status, created_at, updated_at
    FROM friendships
    WHERE user_id = $1 AND friend_id = $2
    `

	var friendship Friendship
	err := r.db.QueryRow(ctx, query, userID, friendID).Scan(
		&friendship.ID,
		&friendship.UserID,
		&friendship.FriendID,
		&friendship.Status,
		&friendship.CreatedAt,
		&friendship.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &friendship, nil
}

func (r *FriendshipRepository) GetFriendships(ctx context.Context, userID int, status string) ([]Friendship, error) {
	query := `
    SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at, f.updated_at
    FROM friendships f
    WHERE (f.user_id = $1 OR f.friend_id = $1)
    `

	params := []interface{}{userID}

	if status != "" {
		query += " AND f.status = $2"
		params = append(params, status)
	}

	rows, err := r.db.Query(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friendships []Friendship

	for rows.Next() {
		var f Friendship
		if err := rows.Scan(&f.ID, &f.UserID, &f.FriendID, &f.Status, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		friendships = append(friendships, f)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return friendships, nil
}

func (r *FriendshipRepository) GetFriendshipRequests(ctx context.Context, userID int) ([]Friendship, error) {
	query := `
    SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at, f.updated_at
    FROM friendships f
    WHERE f.friend_id = $1 AND f.status = $2
    `

	rows, err := r.db.Query(ctx, query, userID, StatusPending)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friendships []Friendship

	for rows.Next() {
		var f Friendship
		if err := rows.Scan(&f.ID, &f.UserID, &f.FriendID, &f.Status, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		friendships = append(friendships, f)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return friendships, nil
}
