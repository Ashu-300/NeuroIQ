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

func MongoInit() {
	ctx , cancle := context.WithTimeout(context.Background() , 10*time.Second)
	defer cancle()
	mongoURI := os.Getenv("MONGO_URI")
	client , err := mongo.Connect(ctx , options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("❌ Connection error:", err)
	}

	// Ping to verify connection
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("❌ Ping error:", err)
	}
	fmt.Println("✅ Connected to MongoDB!")

	questionbankCollection = client.Database("NeuroIQ_QuestionDB").Collection("questionbank")
	examCollection = client.Database("NeuroIQ_QuestionDB").Collection("exam")

}