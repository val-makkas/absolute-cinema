package rooms

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RoomRepository handles database operations for rooms
type RoomRepository struct {
	db *pgxpool.Pool
}

// NewRoomRepository creates a new RoomRepository
func NewRoomRepository(db *pgxpool.Pool) *RoomRepository {
	return &RoomRepository{db: db}
}

// 🔧 Add GetDB for WebSocket compatibility
func (r *RoomRepository) GetDB() *pgxpool.Pool {
	return r.db
}

// 🔧 Add GetUserIDByUsername for WebSocket invitation handling
func (r *RoomRepository) GetUserIDByUsername(ctx context.Context, username string) (int, error) {
	var userID int
	err := r.db.QueryRow(ctx, "SELECT id FROM users WHERE username = $1", username).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, fmt.Errorf("user not found")
		}
		return 0, fmt.Errorf("failed to get user ID: %w", err)
	}
	return userID, nil
}

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
		return fmt.Errorf("failed to create room: %w", err)
	}

	// Add owner as a member
	memberQuery := `
        INSERT INTO room_members (room_id, user_id, role)
        VALUES ($1, $2, $3)
    `

	_, err = r.db.Exec(ctx, memberQuery, room.ID, room.OwnerID, RoleOwner)
	if err != nil {
		return fmt.Errorf("failed to add owner as member: %w", err)
	}

	return nil
}

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
		return nil, fmt.Errorf("failed to get room: %w", err)
	}

	return &room, nil
}

// ✅ KEEP: GetRoomMembers - HTTP CRUD operation (for displaying room info)
func (r *RoomRepository) GetRoomMembers(ctx context.Context, roomID int) ([]RoomMember, error) {
	query := `
        SELECT m.user_id, m.role, m.joined_at, u.username, 
               COALESCE(u.display_name, u.username) as display_name, u.profile_picture_url
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
		return nil, fmt.Errorf("failed to query room members: %w", err)
	}
	defer rows.Close()

	var members []RoomMember
	for rows.Next() {
		var member RoomMember
		var profilePictureURL sql.NullString

		err := rows.Scan(
			&member.UserID, &member.Role, &member.JoinedAt,
			&member.Username, &member.DisplayName, &profilePictureURL)

		if err != nil {
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}

		if profilePictureURL.Valid {
			member.AvatarURL = &profilePictureURL.String
		}

		members = append(members, member)
	}

	return members, nil
}

func (r *RoomRepository) Update(ctx context.Context, room *Room) error {
	query := `
        UPDATE watch_rooms 
        SET name = $1, description = $2, is_private = $3, updated_at = NOW()
        WHERE id = $4
    `

	_, err := r.db.Exec(ctx, query, room.Name, room.Description, room.IsPrivate, room.ID)
	if err != nil {
		return fmt.Errorf("failed to update room: %w", err)
	}

	return nil
}

func (r *RoomRepository) Delete(ctx context.Context, roomID int) error {
	query := `
        UPDATE watch_rooms 
        SET status = 'inactive', updated_at = NOW()
        WHERE id = $1
    `

	_, err := r.db.Exec(ctx, query, roomID)
	if err != nil {
		return fmt.Errorf("failed to delete room: %w", err)
	}

	return nil
}

func (r *RoomRepository) GetInvitations(ctx context.Context, userID int) ([]RoomInvitation, error) {
	query := `
        SELECT 
            i.id, i.room_id, i.invited_by, i.invited_user, i.status, i.created_at,
            r.name as room_name, r.description as room_description,
            u.username as inviter_username, COALESCE(u.display_name, u.username) as inviter_display_name
        FROM room_invitations i
        JOIN watch_rooms r ON i.room_id = r.id
        JOIN users u ON i.invited_by = u.id
        WHERE i.invited_user = $1 AND i.status = 'pending'
        ORDER BY i.created_at DESC
    `

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query invitations: %w", err)
	}
	defer rows.Close()

	var invitations []RoomInvitation
	for rows.Next() {
		var invitation RoomInvitation

		err := rows.Scan(
			&invitation.ID, &invitation.RoomID, &invitation.InviterID, &invitation.InviteeID,
			&invitation.Status, &invitation.CreatedAt,
			&invitation.RoomName, &invitation.RoomDescription,
			&invitation.InviterUsername, &invitation.InviterDisplayName)

		if err != nil {
			return nil, fmt.Errorf("failed to scan invitation: %w", err)
		}

		invitations = append(invitations, invitation)
	}

	return invitations, nil
}

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
		return false, "", fmt.Errorf("failed to check membership: %w", err)
	}

	return true, role, nil
}

func (r *RoomRepository) InviteToRoom(ctx context.Context, roomID, inviterID, inviteeID int, redisClient interface{}) (int, error) {
	isMember, role, err := r.IsRoomMember(ctx, roomID, inviterID)
	if err != nil {
		return 0, err
	}

	if !isMember || (role != RoleOwner && role != RoleAdmin) {
		return 0, errors.New("you don't have permission to invite users to this room")
	}

	var existingInvitation bool
	existQuery := `
        SELECT EXISTS(
            SELECT 1 FROM room_invitations
            WHERE room_id = $1 AND invited_user = $2 AND status = 'pending'
        )
    `

	err = r.db.QueryRow(ctx, existQuery, roomID, inviteeID).Scan(&existingInvitation)
	if err != nil {
		return 0, fmt.Errorf("failed to check existing invitation: %w", err)
	}

	if existingInvitation {
		return 0, errors.New("user already has a pending invitation to this room")
	}

	// Check if already a member
	isMember, _, err = r.IsRoomMember(ctx, roomID, inviteeID)
	if err != nil {
		return 0, err
	}

	if isMember {
		return 0, errors.New("user is already a member of this room")
	}

	// Create invitation
	var invitationID int
	query := `
        INSERT INTO room_invitations (room_id, invited_by, invited_user, status, created_at)
        VALUES ($1, $2, $3, 'pending', NOW())
        RETURNING id
    `

	err = r.db.QueryRow(ctx, query, roomID, inviterID, inviteeID).Scan(&invitationID)
	if err != nil {
		return 0, fmt.Errorf("failed to create invitation: %w", err)
	}

	return invitationID, nil
}

// RespondToInvitation - needed for WebSocket invitation response
func (r *RoomRepository) RespondToInvitation(ctx context.Context, invitationID, userID int, accept bool, redisClient interface{}) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get invitation details
	var roomID, inviterID, inviteeID int
	var status string
	inviteQuery := `
        SELECT room_id, invited_by, invited_user, status
        FROM room_invitations
        WHERE id = $1 AND invited_user = $2 AND status = 'pending'
    `

	err = tx.QueryRow(ctx, inviteQuery, invitationID, userID).
		Scan(&roomID, &inviterID, &inviteeID, &status)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("invitation not found or already processed")
		}
		return fmt.Errorf("failed to get invitation: %w", err)
	}

	newStatus := "declined"
	if accept {
		newStatus = "accepted"
	}

	updateQuery := `
        UPDATE room_invitations
        SET status = $1, updated_at= NOW()
        WHERE id = $2
    `

	_, err = tx.Exec(ctx, updateQuery, newStatus, invitationID)
	if err != nil {
		return fmt.Errorf("failed to update invitation: %w", err)
	}

	if accept {
		memberQuery := `
            INSERT INTO room_members (room_id, user_id, role, joined_at)
            VALUES ($1, $2, 'member', NOW())
            ON CONFLICT (room_id, user_id) DO NOTHING
        `

		_, err = tx.Exec(ctx, memberQuery, roomID, userID)
		if err != nil {
			return fmt.Errorf("failed to add member: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *RoomRepository) GetInvitationByID(ctx context.Context, invitationID int) (*RoomInvitation, error) {
	query := `
        SELECT 
            i.id, i.room_id, i.invited_by, i.invited_user, i.status, i.created_at,
            r.name as room_name, r.description as room_description,
            u.username as inviter_username, COALESCE(u.display_name, u.username) as inviter_display_name
        FROM room_invitations i
        JOIN watch_rooms r ON i.room_id = r.id
        JOIN users u ON i.invited_by = u.id
        WHERE i.id = $1
    `

	var invitation RoomInvitation
	err := r.db.QueryRow(ctx, query, invitationID).Scan(
		&invitation.ID, &invitation.RoomID, &invitation.InviterID, &invitation.InviteeID,
		&invitation.Status, &invitation.CreatedAt,
		&invitation.RoomName, &invitation.RoomDescription,
		&invitation.InviterUsername, &invitation.InviterDisplayName,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get invitation: %w", err)
	}

	return &invitation, nil
}
