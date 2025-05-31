package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	pgPool  *pgxpool.Pool
	pgOnce  sync.Once
	pgError error
)

func GetPostgresClient() (*pgxpool.Pool, error) {
	pgOnce.Do(func() {
		con_url := os.Getenv("DB_URL")
		if con_url == "" {
			pgError = fmt.Errorf("con_url missing")
		}

		config, err := pgxpool.ParseConfig(con_url)
		if err != nil {
			pgError = fmt.Errorf("error parsing con_url: %+v", err)
			return
		}

		config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

		config.MaxConns = 10
		config.MinConns = 2
		config.MaxConnLifetime = time.Hour
		config.MaxConnIdleTime = 30 * time.Minute

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		pgPool, err = pgxpool.NewWithConfig(ctx, config)
		if err != nil {
			pgError = fmt.Errorf("unable to create con pool: %+v", err)
			return
		}

		if err = pgPool.Ping(ctx); err != nil {
			pgError = fmt.Errorf("ping to db failed %+v", err)
			pgPool.Close()
			pgPool = nil
			return
		}

		log.Println("connected to DB.")
	})

	return pgPool, pgError
}

func ClosePostgresClient() {
	if pgPool != nil {
		pgPool.Close()
		pgPool = nil
		log.Println("closed con to DB")
	}
}

func PostgresTrans(ctx context.Context, txFunc func(pgx.Tx) error) error {
	db, err := GetPostgresClient()
	if err != nil {
		return err
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("error in beggining of transaction: %+v", err)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback(ctx)
			panic(p)
		}
	}()

	if err := txFunc(tx); err != nil {
		if rbError := tx.Rollback(ctx); rbError != nil {
			log.Printf("failed to rollback tx: %+v", rbError)
		}
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit tx: %+v", err)
	}

	return nil
}

func CheckAlive(ctx context.Context) error {
	db, err := GetPostgresClient()
	if err != nil {
		return err
	}
	return db.Ping(ctx)
}
