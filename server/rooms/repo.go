package rooms

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	RoomStatusActive   = "active"
	RoomStatusInactive = "inactive"
)

const (
	RoleMember = "member"
	RoleAdmin  = "admin"
	RoleOwner  = "owner"
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
	RoomID    int       `json:"room_id"`
	UserID    int       `json:"user_id"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`
	Username  string    `json:"username,omitempty"`
	AvatarURL string    `json:"avatar_url,omitempty"`
}

type RoomRepository struct {
	db *pgxpool.Pool
}

func NewRoomRepository(db *pgxpool.Pool) *RoomRepository {
	return &RoomRepository{db: db}
}

func (r *RoomRepository) Create(ctx context.Context, room *Room) error {
	query := `
    INSERT INTO watch_rooms (name, description, owner_id, is_private, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, created_at, updated_at
    `

	if room.Status == "" {
		room.Status = RoomStatusActive
	}

	err := r.db.QueryRow(ctx, query,
		room.Name,
		room.Description,
		room.OwnerID,
		room.IsPrivate,
		room.Status,
	).Scan(&room.ID, &room.CreatedAt, &room.UpdatedAt)

	if err != nil {
		return err
	}

	_, err = r.db.Exec(ctx, `
        INSERT INTO room_members (room_id, user_id, role)
        VALUES ($1, $2, $3)
    `, room.ID, room.OwnerID, RoleOwner)

	return err
}

func (r *RoomRepository) GetByID(ctx context.Context, id int) (*Room, error) {
	query := `
    SELECT id, name, description, owner_id, is_private, status, created_at, updated_at
    FROM watch_rooms
    WHERE id = $1
    `
	room := &Room{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&room.ID,
		&room.Name,
		&room.Description,
		&room.OwnerID,
		&room.IsPrivate,
		&room.Status,
		&room.CreatedAt,
		&room.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return room, nil
}

func (r *RoomRepository) GetRooms(ctx context.Context, userID int, limit, offset int) ([]Room, error) {
	query := `
    SELECT DISTINCT r.id, r.name, r.description, r.owner_id, r.is_private, r.status, r.created_at, r.updated_at
    FROM watch_rooms r
    LEFT JOIN room_members m ON r.id = m.room_id
    WHERE (r.is_private = false AND r.status = $1) OR m.user_id = $2
    ORDER BY r.created_at DESC
    LIMIT $3 OFFSET $4
    `

	rows, err := r.db.Query(ctx, query, RoomStatusActive, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []Room

	for rows.Next() {
		var room Room
		err := rows.Scan(
			&room.ID,
			&room.Name,
			&room.Description,
			&room.OwnerID,
			&room.IsPrivate,
			&room.Status,
			&room.CreatedAt,
			&room.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return rooms, nil
}

func (r *RoomRepository) AddMember(ctx context.Context, roomID, userID int, role string) error {
	var exists bool
	err := r.db.QueryRow(ctx, `
    SELECT EXISTS(SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2)
    `, roomID, userID).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		return errors.New("user is already a member of this room")
	}

	if role == "" {
		role = RoleMember
	}

	_, err = r.db.Exec(ctx, `
    INSERT INTO room_members (room_id, user_id, role)
    VALUES ($1, $2, $3)
    `, roomID, userID, role)

	return err
}

func (r *RoomRepository) RemoveMember(ctx context.Context, roomID, userID int) error {
	_, err := r.db.Exec(ctx, `
    DELETE FROM room_members
    WHERE room_id = $1 AND user_id = $2
    `, roomID, userID)

	return err
}

func (r *RoomRepository) GetRoomMembers(ctx context.Context, roomID int) ([]RoomMember, error) {
	query := `
    SELECT rm.room_id, rm.user_id, rm.role, rm.joined_at, u.username, u.profile_picture_url
    FROM room_members rm
    JOIN users u ON rm.user_id = u.id
    WHERE rm.room_id = $1
    ORDER BY rm.role, rm.joined_at
    `

	rows, err := r.db.Query(ctx, query, roomID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []RoomMember

	for rows.Next() {
		var member RoomMember
		err := rows.Scan(
			&member.RoomID,
			&member.UserID,
			&member.Role,
			&member.JoinedAt,
			&member.Username,
			&member.AvatarURL,
		)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return members, nil
}

func (r *RoomRepository) IsRoomMember(ctx context.Context, roomID, userID int) (bool, string, error) {
	var role string
	err := r.db.QueryRow(ctx, `
    SELECT role FROM room_members 
    WHERE room_id = $1 AND user_id = $2
    `, roomID, userID).Scan(&role)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, "", nil
		}
		return false, "", err
	}

	return true, role, nil
}

func (r *RoomRepository) UpdateRoom(ctx context.Context, room *Room) error {
	query := `
    UPDATE watch_rooms
    SET name = $1, description = $2, is_private = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING updated_at
    `

	return r.db.QueryRow(ctx, query,
		room.Name,
		room.Description,
		room.IsPrivate,
		room.ID,
	).Scan(&room.UpdatedAt)
}

func (r *RoomRepository) ChangeRoomStatus(ctx context.Context, roomID int, status string) error {
	_, err := r.db.Exec(ctx, `
    UPDATE watch_rooms
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    `, status, roomID)

	return err
}

func (r *RoomRepository) UpdateMemberRole(ctx context.Context, roomID, userID int, role string) error {
	if role != RoleMember && role != RoleAdmin && role != RoleOwner {
		return errors.New("invalid role")
	}

	_, err := r.db.Exec(ctx, `
    UPDATE room_members
    SET role = $1
    WHERE room_id = $2 AND user_id = $3
    `, role, roomID, userID)

	return err
}
