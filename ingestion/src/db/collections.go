package db

import "go.mongodb.org/mongo-driver/mongo"

var ingestionCollection *mongo.Collection

func GetIngestionCollection() *mongo.Collection{
	return ingestionCollection
}