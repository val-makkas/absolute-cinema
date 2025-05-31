package users

import (
	"context"
	"errors"
	"log"
	"time"
	"zync-stream/ws"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(ctx context.Context, user *User) error {
	query := `
    INSERT INTO users (username, email, password_hash, display_name, extensions)
    VALUES ($1, $2, $3, $4 ,$5)
    RETURNING id, created_at, updated_at
    `

	if user.Extensions == nil {
		user.Extensions = []string{}
	}

	return r.db.QueryRow(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.DisplayName,
		user.Extensions,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *UserRepo) GetByID(ctx context.Context, id int) (*User, error) {
	query := `
    SELECT id, username, email, password_hash, display_name, profile_picture_url, bio,
    extensions, created_at, updated_at, last_login_at
    FROM users
    WHERE id = $1
    `

	user := &User{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.ProfilePictureURL,
		&user.Bio,
		&user.Extensions,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return user, nil
}

func (r *UserRepo) GetByUsername(ctx context.Context, username string) (*User, error) {
	query := `
    SELECT id, username, email, password_hash, display_name, profile_picture_url, bio,
    extensions, created_at, updated_at, last_login_at
    FROM users
    WHERE username = $1
    `

	user := &User{}
	err := r.db.QueryRow(ctx, query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.ProfilePictureURL,
		&user.Bio,
		&user.Extensions,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return user, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*User, error) {
	query := `
    SELECT id, username, email, password_hash, display_name, profile_picture_url, bio,
    extensions, created_at, updated_at, last_login_at
    FROM users
    WHERE email = $1
    `

	user := &User{}
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.ProfilePictureURL,
		&user.Bio,
		&user.Extensions,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return user, nil
}

func (r *UserRepo) Update(ctx context.Context, user *User) error {
	query := `
    UPDATE users
    SET display_name = $1, profile_picture_url = $2, bio = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING updated_at
    `

	return r.db.QueryRow(ctx, query, user.DisplayName, user.ProfilePictureURL, user.Bio, user.ID).Scan(&user.UpdatedAt)
}

func (r *UserRepo) UpdateExtensions(ctx context.Context, userID int, extensions []string) error {
	query := `
    UPDATE users
    SET extensions = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING extensions
    `
	var updatedExtensions []string
	err := r.db.QueryRow(ctx, query, extensions, userID).Scan(&updatedExtensions)
	if err != nil {
		log.Printf("Error updating extensions: %v", err)
		return err
	}

	log.Printf("Extensions after update: %v", updatedExtensions)
	return nil
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, id int) error {
	query := `
    UPDATE users
    SET last_login_at = NOW()
    WHERE id = $1
    `

	_, err := r.db.Exec(ctx, query, id)
	return err
}

func (r *UserRepo) UpdatePassword(ctx context.Context, userID int, newPasswordHash string) error {
	_, err := r.db.Exec(ctx, `
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
    `, newPasswordHash, userID)
	return err
}

func (r *UserRepo) UpdateAvatar(ctx context.Context, userID int, avatarURL string) error {
	_, err := r.db.Exec(ctx, `
        UPDATE users 
        SET profile_picture_url = $1, updated_at = NOW()
        WHERE id = $2
    `, avatarURL, userID)
	return err
}

func (r *UserRepo) UpdateStatus(ctx context.Context, userID int, status, customStatus string) error {
	_, err := r.db.Exec(ctx, `
        INSERT INTO user_status (user_id, status, custom_status, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET status = $2, custom_status = $3, updated_at = NOW()
    `, userID, status, customStatus)
	return err
}

func (r *UserRepo) UpdateWatchHistory(ctx context.Context, userID int, req *WatchHistoryRequest) (*WatchHistoryEntry, error) {
	if req.MediaType == "movie" {
		zero := 0
		req.SeasonNumber = &zero
		req.EpisodeNumber = &zero
	}

	query := `
    WITH upsert AS (
        INSERT INTO watch_history 
        (user_id, imdb_id, media_type, season_number, episode_number, 
        timestamp_seconds, duration_seconds, percentage_watched, last_watched)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (user_id, imdb_id, COALESCE(season_number, 0), COALESCE(episode_number, 0)) 
        DO UPDATE SET
            timestamp_seconds = EXCLUDED.timestamp_seconds,
            duration_seconds = EXCLUDED.duration_seconds,
            percentage_watched = EXCLUDED.percentage_watched,
            last_watched = NOW()
        RETURNING *
    ),
    cleanup AS (
        DELETE FROM watch_history
        WHERE id IN (
            SELECT id FROM watch_history 
            WHERE user_id = $1 
            ORDER BY last_watched DESC 
            OFFSET 10
        )
    )
    SELECT * FROM upsert
    `

	var entry WatchHistoryEntry
	err := r.db.QueryRow(ctx, query,
		userID,
		req.ImdbID,
		req.MediaType,
		req.SeasonNumber,
		req.EpisodeNumber,
		req.TimestampSeconds,
		req.DurationSeconds,
		req.PercentageWatched,
	).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.ImdbID,
		&entry.MediaType,
		&entry.SeasonNumber,
		&entry.EpisodeNumber,
		&entry.TimestampSeconds,
		&entry.DurationSeconds,
		&entry.PercentageWatched,
		&entry.LastWatched,
	)

	if err != nil {
		return nil, err
	}

	return &entry, nil
}

func (r *UserRepo) GetWatchHistory(ctx context.Context, userID int) ([]*WatchHistoryEntry, error) {
	query := `
    SELECT id, user_id, imdb_id, media_type, season_number, episode_number, 
           timestamp_seconds, duration_seconds, percentage_watched, last_watched
    FROM watch_history
    WHERE user_id = $1
    ORDER BY last_watched DESC
    LIMIT 10
    `

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*WatchHistoryEntry
	for rows.Next() {
		entry := &WatchHistoryEntry{}
		if err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&entry.ImdbID,
			&entry.MediaType,
			&entry.SeasonNumber,
			&entry.EpisodeNumber,
			&entry.TimestampSeconds,
			&entry.DurationSeconds,
			&entry.PercentageWatched,
			&entry.LastWatched,
		); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	return entries, rows.Err()
}

func (r *UserRepo) GetWatchHistoryItem(ctx context.Context, userID int, imdbID string, seasonNum, episodeNum *int) (*WatchHistoryEntry, error) {
	query := `
    SELECT id, user_id, imdb_id, media_type, season_number, episode_number, 
           timestamp_seconds, duration_seconds, percentage_watched, last_watched
    FROM watch_history
    WHERE user_id = $1 AND imdb_id = $2 
    AND COALESCE(season_number, 0) = COALESCE($3, 0)
    AND COALESCE(episode_number, 0) = COALESCE($4, 0)
    `

	entry := &WatchHistoryEntry{}
	err := r.db.QueryRow(ctx, query, userID, imdbID, seasonNum, episodeNum).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.ImdbID,
		&entry.MediaType,
		&entry.SeasonNumber,
		&entry.EpisodeNumber,
		&entry.TimestampSeconds,
		&entry.DurationSeconds,
		&entry.PercentageWatched,
		&entry.LastWatched,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return entry, nil
}

func (r *UserRepo) SearchUsers(ctx context.Context, query string) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
        SELECT id, username, display_name, profile_picture_url
        FROM users
        WHERE 
            username ILIKE $1 OR
            display_name ILIKE $1
        LIMIT 10
    `, "%"+query+"%")

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []map[string]interface{}

	for rows.Next() {
		var id int
		var username string
		var displayName, profilePic pgtype.Text

		err := rows.Scan(&id, &username, &displayName, &profilePic)
		if err != nil {
			return nil, err
		}

		user := map[string]interface{}{
			"id":       id,
			"username": username,
		}

		if displayName.Valid {
			user["display_name"] = displayName.String
		}

		if profilePic.Valid {
			user["profile_picture_url"] = profilePic.String
		}

		users = append(users, user)
	}

	return users, nil
}

func (r *UserRepo) GetFriends(ctx context.Context, userID int) ([]map[string]interface{}, error) {
	query := `
        SELECT 
            u.id, u.username, u.display_name, u.profile_picture_url,
            COALESCE(s.status, 'offline') as status,
            s.custom_status
        FROM users u
        JOIN friendships f ON (u.id = f.user_id OR u.id = f.friend_id)
        LEFT JOIN user_status s ON u.id = s.user_id
        WHERE 
            (f.user_id = $1 OR f.friend_id = $1) AND
            f.status = 'accepted' AND
            u.id != $1
        ORDER BY u.username
    `

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friends []map[string]any

	for rows.Next() {
		var id int
		var username string
		var displayName, profilePic, customStatus pgtype.Text
		var status string

		err := rows.Scan(&id, &username, &displayName, &profilePic, &status, &customStatus)
		if err != nil {
			return nil, err
		}

		friend := map[string]interface{}{
			"id":       id,
			"username": username,
			"status":   status,
		}

		if displayName.Valid {
			friend["display_name"] = displayName.String
		}

		if profilePic.Valid {
			friend["profile_picture_url"] = profilePic.String
		}

		if customStatus.Valid {
			friend["custom_status"] = customStatus.String
		}

		friends = append(friends, friend)
	}

	return friends, nil
}

func (r *UserRepo) GetFriendship(ctx context.Context, userID1, userID2 int) (*Friendship, error) {
	query := `
        SELECT id, user_id, friend_id, status, created_at, updated_at
        FROM friendships
        WHERE 
            (user_id = $1 AND friend_id = $2) OR
            (user_id = $2 AND friend_id = $1)
        LIMIT 1
    `

	var friendship Friendship
	err := r.db.QueryRow(ctx, query, userID1, userID2).Scan(
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

func (r *UserRepo) SendFriendRequest(ctx context.Context, senderID, receiverID int) error {
	var exists bool
	err := r.db.QueryRow(ctx, `
        SELECT EXISTS (
            SELECT 1 FROM friendships
            WHERE 
                (user_id = $1 AND friend_id = $2) OR
                (user_id = $2 AND friend_id = $1)
        )
    `, senderID, receiverID).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		return errors.New("friendship or request already exists")
	}

	_, err = r.db.Exec(ctx, `
        INSERT INTO friendships (user_id, friend_id, status)
        VALUES ($1, $2, 'pending')
    `, senderID, receiverID)

	return err
}

func (r *UserRepo) GetFriendRequests(ctx context.Context, userID int) ([]map[string]interface{}, error) {
	query := `
        SELECT 
            f.id, f.user_id, f.created_at,
            u.username, u.display_name, u.profile_picture_url
        FROM friendships f
        JOIN users u ON f.user_id = u.id
        WHERE f.friend_id = $1 AND f.status = 'pending'
        ORDER BY f.created_at DESC
    `

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []map[string]any

	for rows.Next() {
		var id, senderID int
		var createdAt time.Time
		var username string
		var displayName, profilePic pgtype.Text

		err := rows.Scan(&id, &senderID, &createdAt, &username, &displayName, &profilePic)
		if err != nil {
			return nil, err
		}

		request := map[string]interface{}{
			"id":         id,
			"sender_id":  senderID,
			"username":   username,
			"created_at": createdAt,
		}

		if displayName.Valid {
			request["display_name"] = displayName.String
		}

		if profilePic.Valid {
			request["profile_picture_url"] = profilePic.String
		}

		requests = append(requests, request)
	}

	return requests, nil
}

// RespondToFriendRequest accepts or rejects a friend request
func (r *UserRepo) RespondToFriendRequest(ctx context.Context, requestID, userID int, accept bool) error {
	// Begin transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Verify the request is to this user
	var senderID int
	err = tx.QueryRow(ctx, `
        SELECT user_id FROM friendships
        WHERE id = $1 AND friend_id = $2 AND status = 'pending'
    `, requestID, userID).Scan(&senderID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("invalid friend request")
		}
		return err
	}

	if accept {
		// Update friendship status to accepted
		_, err = tx.Exec(ctx, `
            UPDATE friendships
            SET status = 'accepted', updated_at = NOW()
            WHERE id = $1
        `, requestID)
	} else {
		// Delete the friendship record if rejected
		_, err = tx.Exec(ctx, `
            DELETE FROM friendships
            WHERE id = $1
        `, requestID)
	}

	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// RemoveFriend removes a friendship between two users
func (r *UserRepo) RemoveFriend(ctx context.Context, userID, friendID int) error {
	_, err := r.db.Exec(ctx, `
        DELETE FROM friendships
        WHERE 
            ((user_id = $1 AND friend_id = $2) OR
            (user_id = $2 AND friend_id = $1)) AND
            status = 'accepted'
    `, userID, friendID)

	return err
}

func (r *UserRepo) GetFriendRequestByID(ctx context.Context, requestID int) (*FriendRequestDetails, error) {
	query := `
        SELECT id, user_id as sender_id, friend_id as receiver_id, created_at
        FROM friendships
        WHERE id = $1 AND status = 'pending'
    `

	row := r.db.QueryRow(ctx, query, requestID)

	var request FriendRequestDetails
	err := row.Scan(
		&request.ID,
		&request.SenderID,
		&request.ReceiverID,
		&request.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &request, nil
}

func (r *UserRepo) UpdateUserStatus(ctx context.Context, userID int, status, activity string) error {
	return r.UpdateStatus(ctx, userID, status, activity)
}

// GetUserFriends - returns just friend IDs
func (r *UserRepo) GetUserFriends(ctx context.Context, userID int) ([]int, error) {
	query := `
        SELECT 
            CASE 
                WHEN f.user_id = $1 THEN f.friend_id
                ELSE f.user_id
            END as friend_id
        FROM friendships f
        WHERE (f.user_id = $1 OR f.friend_id = $1) 
        AND f.status = 'accepted'
    `

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friendIDs []int
	for rows.Next() {
		var friendID int
		if err := rows.Scan(&friendID); err != nil {
			return nil, err
		}
		friendIDs = append(friendIDs, friendID)
	}

	return friendIDs, nil
}

// GetFriendsWithStatus - returns friends with status info for presence manager
func (r *UserRepo) GetFriendsWithStatus(ctx context.Context, userID int) ([]ws.FriendStatusInfo, error) {
	query := `
        SELECT 
            u.id, u.username,
            COALESCE(s.status, 'offline') as status,
            COALESCE(s.custom_status, '') as activity,
            COALESCE(s.updated_at, NOW()) as last_seen
        FROM users u
        JOIN friendships f ON (u.id = f.user_id OR u.id = f.friend_id)
        LEFT JOIN user_status s ON u.id = s.user_id
        WHERE 
            (f.user_id = $1 OR f.friend_id = $1) AND
            f.status = 'accepted' AND
            u.id != $1
    `

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friends []ws.FriendStatusInfo
	for rows.Next() {
		var friend ws.FriendStatusInfo
		if err := rows.Scan(&friend.UserID, &friend.Username, &friend.Status, &friend.Activity, &friend.LastSeen); err != nil {
			return nil, err
		}
		friends = append(friends, friend)
	}

	return friends, nil
}
