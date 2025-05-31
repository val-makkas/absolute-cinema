package db

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var redisClient *redis.Client

func InitRedisClient(redisURL string) error {
    if redisURL == "" {
        return fmt.Errorf("REDIS_URL is not set")
    }

    opts, err := redis.ParseURL(redisURL)
    if err != nil {
        return fmt.Errorf("failed to parse Redis URL: %w", err)
    }

    if strings.HasPrefix(redisURL, "rediss://") {
        opts.TLSConfig = &tls.Config{
            MinVersion: tls.VersionTLS12,
        }
    }

    opts.DialTimeout = 5 * time.Second
    opts.ReadTimeout = 3 * time.Second
    opts.WriteTimeout = 3 * time.Second

    redisClient = redis.NewClient(opts)

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if _, err := redisClient.Ping(ctx).Result(); err != nil {
        return fmt.Errorf("failed to connect to Redis: %w", err)
    }

    log.Println("Successfully connected to Redis")
    return nil
}

func GetRedisClient() (*redis.Client, error) {
    if redisClient == nil {
        return nil, errors.New("redis client not initialized")
    }
    return redisClient, nil
}

func CloseRedisClient() error {
    if redisClient != nil {
        err := redisClient.Close()
        if err != nil {
            return err
        }
        log.Println("Redis connection closed")
        redisClient = nil
    }
    return nil
}

func CheckRedisAlive(ctx context.Context) error {
    client, err := GetRedisClient()
    if err != nil {
        return err
    }
    
    _, err = client.Ping(ctx).Result()
    return err
}