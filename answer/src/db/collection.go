package db

import "go.mongodb.org/mongo-driver/mongo"

var answerCollection *mongo.Collection
var evaluationCollection *mongo.Collection

func GetAnswerCollection() *mongo.Collection {
	return answerCollection 
}

func GetEvaluationCollection() *mongo.Collection {
	return evaluationCollection 
}