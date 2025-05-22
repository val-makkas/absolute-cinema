package users

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
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
	INSERT INTO user (username, email, password_hash, extensions)
	VALUES ($1, $2, $3, $4)
	RETURNING id, created_at, updated_at
	`

	if user.Extensions == nil {
		user.Extensions = []string{}
	}

	return r.db.QueryRow(ctx, query,
		user.Username,
		user.Email,
		user.PasswordHash,
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
	SET display_name = $1, profile_picture-url = $2, bio = $3, updated_at = NOW()
	WHERE id = $4
	RETURNING updated_at
	`

	return r.db.QueryRow(ctx, query, user.DisplayName, user.ProfilePictureURL, user.Bio, user.ID).Scan(&user.UpdatedAt)
}

func (r *UserRepo) UpdateExtensions(ctx context.Context, userID int, extensions []string) error {
	query := `
	UPDATE users
	SET extensions = $1, update_at = NOW()
	WHERE id = $2
	`

	_, err := r.db.Exec(ctx, query, extensions, userID)
	return err
}

func (r *UserRepo) UpdateLastLogin(ctx context.Context, id int) error {
	query := `
	UPDATE users()
	SET last_login_at = NOW()
	WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, id)
	return err
}
