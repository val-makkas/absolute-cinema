package rooms

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// RoomRepository handles database operations for rooms
type RoomRepository struct {
	db *pgxpool.Pool
}

// NewRoomRepository creates a new RoomRepository
func NewRoomRepository(db *pgxpool.Pool) *RoomRepository {
	return &RoomRepository{db: db}
}

// GetRooms retrieves all accessible rooms for a user
func (r *RoomRepository) GetRooms(ctx context.Context, userID, limit, offset int) ([]map[string]interface{}, error) {
	query := `
        SELECT DISTINCT 
            r.id, r.name, r.description, r.owner_id, r.is_private, 
            r.status, r.created_at, r.updated_at, 
            COALESCE(u.username, '') as owner_name,
            (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count,
            CASE WHEN r.owner_id = $1 THEN true 
                 WHEN EXISTS (SELECT 1 FROM room_members WHERE room_id = r.id AND user_id = $1) THEN true 
                 ELSE false END as is_member
        FROM watch_rooms r
        LEFT JOIN users u ON r.owner_id = u.id
        LEFT JOIN room_members m ON r.id = m.room_id
        WHERE r.status = 'active' AND (
            r.is_private = false OR 
            r.owner_id = $1 OR 
            (r.is_private = true AND m.user_id = $1)
        )
        ORDER BY 
            CASE WHEN r.owner_id = $1 THEN 0 
                 WHEN EXISTS (SELECT 1 FROM room_members WHERE room_id = r.id AND user_id = $1) THEN 1 
                 ELSE 2 END,
            r.created_at DESC
        LIMIT $2 OFFSET $3
    `

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rooms := []map[string]interface{}{}
	for rows.Next() {
		var id, ownerID, memberCount int
		var name, description, status, ownerName string
		var isPrivate, isMember bool
		var createdAt, updatedAt time.Time

		err := rows.Scan(&id, &name, &description, &ownerID, &isPrivate,
			&status, &createdAt, &updatedAt, &ownerName, &memberCount, &isMember)
		if err != nil {
			return nil, err
		}

		room := map[string]interface{}{
			"id":           id,
			"name":         name,
			"description":  description,
			"owner_id":     ownerID,
			"is_private":   isPrivate,
			"status":       status,
			"created_at":   createdAt,
			"updated_at":   updatedAt,
			"owner_name":   ownerName,
			"member_count": memberCount,
			"is_member":    isMember,
		}

		rooms = append(rooms, room)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return rooms, nil
}

// Create adds a new room to the database
func (r *RoomRepository) Create(ctx context.Context, room *Room) error {
	query := `
        INSERT INTO watch_rooms (name, description, owner_id, is_private, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at, updated_at
    `

	err := r.db.QueryRow(ctx, query,
		room.Name, room.Description, room.OwnerID, room.IsPrivate, room.Status).
		Scan(&room.ID, &room.CreatedAt, &room.UpdatedAt)

	if err != nil {
		return err
	}

	// Add owner as a member
	memberQuery := `
        INSERT INTO room_members (room_id, user_id, role)
        VALUES ($1, $2, $3)
    `

	_, err = r.db.Exec(ctx, memberQuery, room.ID, room.OwnerID, RoleOwner)
	return err
}

// GetByID retrieves a room by its ID
func (r *RoomRepository) GetByID(ctx context.Context, id int) (*Room, error) {
	query := `
        SELECT id, name, description, owner_id, is_private, status, created_at, updated_at
        FROM watch_rooms
        WHERE id = $1 AND status = 'active'
    `

	var room Room
	err := r.db.QueryRow(ctx, query, id).Scan(
		&room.ID, &room.Name, &room.Description, &room.OwnerID,
		&room.IsPrivate, &room.Status, &room.CreatedAt, &room.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // Room not found
		}
		return nil, err
	}

	return &room, nil
}

// GetRoomMembers gets all members of a room
func (r *RoomRepository) GetRoomMembers(ctx context.Context, roomID int) ([]map[string]interface{}, error) {
	query := `
        SELECT m.room_id, m.user_id, m.role, m.joined_at, u.username, u.profile_picture_url
        FROM room_members m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = $1
        ORDER BY 
            CASE m.role
                WHEN 'owner' THEN 0
                WHEN 'admin' THEN 1
                ELSE 2
            END,
            u.username
    `

	rows, err := r.db.Query(ctx, query, roomID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []map[string]interface{}{}
	for rows.Next() {
		var member RoomMember
		var profilePictureURL pgtype.Text

		err := rows.Scan(
			&member.RoomID, &member.UserID, &member.Role, &member.JoinedAt,
			&member.Username, &profilePictureURL)

		if err != nil {
			return nil, err
		}

		memberMap := map[string]interface{}{
			"room_id":   member.RoomID,
			"user_id":   member.UserID,
			"role":      member.Role,
			"joined_at": member.JoinedAt,
			"username":  member.Username,
		}

		if profilePictureURL.Valid {
			memberMap["avatar_url"] = profilePictureURL.String
		}

		members = append(members, memberMap)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return members, nil
}

// IsRoomMember checks if a user is a member of the room
func (r *RoomRepository) IsRoomMember(ctx context.Context, roomID, userID int) (bool, string, error) {
	query := `
        SELECT role FROM room_members
        WHERE room_id = $1 AND user_id = $2
    `

	var role string
	err := r.db.QueryRow(ctx, query, roomID, userID).Scan(&role)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, "", nil // Not a member
		}
		return false, "", err
	}

	return true, role, nil
}

// AddMember adds a user to a room
func (r *RoomRepository) AddMember(ctx context.Context, roomID, userID int, role string) error {
	// Check if already a member
	isMember, _, err := r.IsRoomMember(ctx, roomID, userID)
	if err != nil {
		return err
	}

	if isMember {
		return errors.New("user is already a member of this room")
	}

	// Check if room exists and is not private (or handle invitation checks here)
	room, err := r.GetByID(ctx, roomID)
	if err != nil {
		return err
	}

	if room == nil {
		return errors.New("room not found")
	}

	if room.IsPrivate {
		// For private rooms, check if there's an accepted invitation
		var invitationExists bool
		checkQuery := `
            SELECT EXISTS(
                SELECT 1 FROM room_invitations
                WHERE room_id = $1 AND invited_user = $2 AND status = 'accepted'
            )
        `

		err = r.db.QueryRow(ctx, checkQuery, roomID, userID).Scan(&invitationExists)
		if err != nil {
			return err
		}

		if !invitationExists && room.OwnerID != userID {
			return errors.New("invitation required for private room")
		}
	}

	// Add member
	query := `
        INSERT INTO room_members (room_id, user_id, role)
        VALUES ($1, $2, $3)
    `

	_, err = r.db.Exec(ctx, query, roomID, userID, role)
	return err
}

// RemoveMember removes a user from a room
func (r *RoomRepository) RemoveMember(ctx context.Context, roomID, userID int) error {
	query := `
        DELETE FROM room_members
        WHERE room_id = $1 AND user_id = $2
    `

	_, err := r.db.Exec(ctx, query, roomID, userID)
	return err
}

// InviteToRoom creates a room invitation
func (r *RoomRepository) InviteToRoom(ctx context.Context, roomID, inviterID, invitedUserID int, redisClient *redis.Client) (int, error) {
	// Check if room exists
	room, err := r.GetByID(ctx, roomID)
	if err != nil {
		return 0, err
	}

	if room == nil {
		return 0, errors.New("room not found")
	}

	// Check if inviter is a member with permission to invite
	isMember, role, err := r.IsRoomMember(ctx, roomID, inviterID)
	if err != nil {
		return 0, err
	}

	if !isMember || (role != RoleOwner && role != RoleAdmin) {
		return 0, errors.New("you don't have permission to invite users to this room")
	}

	// Check if invited user already has a pending invitation
	var existingInvitation bool
	existQuery := `
        SELECT EXISTS(
            SELECT 1 FROM room_invitations
            WHERE room_id = $1 AND invited_user = $2 AND status = 'pending'
        )
    `

	err = r.db.QueryRow(ctx, existQuery, roomID, invitedUserID).Scan(&existingInvitation)
	if err != nil {
		return 0, err
	}

	if existingInvitation {
		return 0, errors.New("user already has a pending invitation to this room")
	}

	// Check if user is already a member
	isMember, _, err = r.IsRoomMember(ctx, roomID, invitedUserID)
	if err != nil {
		return 0, err
	}

	if isMember {
		return 0, errors.New("user is already a member of this room")
	}

	// Create invitation
	var invitationID int
	query := `
        INSERT INTO room_invitations (room_id, invited_by, invited_user, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
    `

	err = r.db.QueryRow(ctx, query, roomID, inviterID, invitedUserID, InviteStatusPending).Scan(&invitationID)
	if err != nil {
		return 0, err
	}

	// Send notification through Redis if available
	if redisClient != nil {
		stateManager := NewRoomStateManager(redisClient)

		// Get inviter username
		var inviterName string
		userQuery := "SELECT username FROM users WHERE id = $1"
		err = r.db.QueryRow(ctx, userQuery, inviterID).Scan(&inviterName)
		if err == nil {
			stateManager.SendInvitation(ctx, invitationID, roomID, room.Name, inviterID, inviterName, invitedUserID)
		}
	}

	return invitationID, nil
}

// RespondToInvitation accepts or rejects a room invitation
func (r *RoomRepository) RespondToInvitation(ctx context.Context, invitationID, userID int, accept bool, redisClient *redis.Client) error {
	// Begin transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Get invitation details
	var invitation RoomInvitation
	inviteQuery := `
        SELECT id, room_id, invited_by, invited_user, status
        FROM room_invitations
        WHERE id = $1 AND invited_user = $2 AND status = $3
    `

	err = tx.QueryRow(ctx, inviteQuery, invitationID, userID, InviteStatusPending).
		Scan(&invitation.ID, &invitation.RoomID, &invitation.InvitedBy, &invitation.InvitedUser, &invitation.Status)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("invitation not found or already processed")
		}
		return err
	}

	// Update invitation status
	status := InviteStatusRejected
	if accept {
		status = InviteStatusAccepted
	}

	updateQuery := `
        UPDATE room_invitations
        SET status = $1, updated_at = NOW()
        WHERE id = $2
    `

	_, err = tx.Exec(ctx, updateQuery, status, invitationID)
	if err != nil {
		return err
	}

	// If accepted, add user to room
	if accept {
		memberQuery := `
            INSERT INTO room_members (room_id, user_id, role)
            VALUES ($1, $2, $3)
        `

		_, err = tx.Exec(ctx, memberQuery, invitation.RoomID, userID, RoleMember)
		if err != nil {
			return err
		}
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return err
	}

	// Send notification through Redis if available
	if redisClient != nil {
		stateManager := NewRoomStateManager(redisClient)

		// Get responder's username
		var username string
		userQuery := "SELECT username FROM users WHERE id = $1"
		err = r.db.QueryRow(ctx, userQuery, userID).Scan(&username)
		if err == nil {
			var roomName string
			roomQuery := "SELECT name FROM watch_rooms WHERE id = $1"
			err = r.db.QueryRow(ctx, roomQuery, invitation.RoomID).Scan(&roomName)
			if err == nil {
				stateManager.SendInviteResponse(ctx, invitationID, invitation.RoomID, roomName, userID, username, invitation.InvitedBy, accept)
			}
		}
	}

	return nil
}

// GetInvitations gets all pending invitations for a user
func (r *RoomRepository) GetInvitations(ctx context.Context, userID int) ([]map[string]interface{}, error) {
	query := `
        SELECT 
            i.id, i.room_id, i.invited_by, i.status, i.created_at,
            r.name as room_name, r.description as room_description,
            u.username as inviter_username
        FROM room_invitations i
        JOIN watch_rooms r ON i.room_id = r.id
        JOIN users u ON i.invited_by = u.id
        WHERE i.invited_user = $1 AND i.status = $2
    `

	rows, err := r.db.Query(ctx, query, userID, InviteStatusPending)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invitations := []map[string]interface{}{}
	for rows.Next() {
		var id, roomID, invitedBy int
		var status, roomName, roomDesc, inviterName string
		var createdAt time.Time

		err := rows.Scan(&id, &roomID, &invitedBy, &status, &createdAt,
			&roomName, &roomDesc, &inviterName)

		if err != nil {
			return nil, err
		}

		invitation := map[string]interface{}{
			"id":               id,
			"room_id":          roomID,
			"invited_by":       invitedBy,
			"status":           status,
			"created_at":       createdAt,
			"room_name":        roomName,
			"room_description": roomDesc,
			"inviter_username": inviterName,
		}

		invitations = append(invitations, invitation)
	}

	return invitations, nil
}
