package db

import (
	"context"
	"log"
	"os"
	"sync"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	clientInstance *mongo.Client
	clientInitOnce sync.Once
)

func GetMongoClient() *mongo.Client {
	clientInitOnce.Do(func() {
		uri := os.Getenv("MONGODB_URI")
		if uri == "" {
			uri = "mongodb://localhost:27017"
		}
		client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(uri))
		if err != nil {
			log.Fatal("Failed to connect to MongoDB:", err)
		}
		clientInstance = client
	})
	return clientInstance
}

func GetUsers() *mongo.Collection {
	client := GetMongoClient()
	return client.Database("absolute-cinema-db").Collection("users")
}
