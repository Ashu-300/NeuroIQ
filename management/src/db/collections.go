package db

import "go.mongodb.org/mongo-driver/mongo"

var seatingCollection *mongo.Collection

func GetSeatingCollection() *mongo.Collection{
	return seatingCollection
}