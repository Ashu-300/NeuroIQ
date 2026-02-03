package db

import "go.mongodb.org/mongo-driver/mongo"

var seatingCollection *mongo.Collection

var examScheduleCollection *mongo.Collection

func GetSeatingCollection() *mongo.Collection{
	return seatingCollection
}

func GetExamScheduleCollection() *mongo.Collection{
	return examScheduleCollection
}