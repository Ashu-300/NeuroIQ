package db

import "go.mongodb.org/mongo-driver/mongo"

var questionbankCollection *mongo.Collection
var examCollection *mongo.Collection


func GetQuestionbankCollection() *mongo.Collection{
	return questionbankCollection
}

func GetExamCollection() *mongo.Collection{
	return examCollection
}