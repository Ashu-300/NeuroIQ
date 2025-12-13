package db

import "go.mongodb.org/mongo-driver/mongo"

var questionbankCollection *mongo.Collection

func GetQuestionbankCollection() *mongo.Collection{
	return questionbankCollection
}