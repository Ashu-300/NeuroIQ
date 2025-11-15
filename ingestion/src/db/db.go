package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func InitDB() {
	ctx, cancle := context.WithTimeout(context.Background() , 10*time.Second)
	defer cancle()
	mongoUri := os.Getenv("MONGO_URI")
	client , err := mongo.Connect(ctx , options.Client().ApplyURI(mongoUri))
	if err != nil {
		log.Fatal("❌ Connection error:", err)
	}

	// Ping to verify connection
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("❌ Ping error:", err)
	}
	fmt.Println("✅ Connected to MongoDB!")

	ingestionCollection = client.Database("NeuroIQIngestionDB").Collection("Syallabus")

}