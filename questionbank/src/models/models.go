package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Questions struct {
	ID 			primitive.ObjectID		`json:"_id" bson:"_id validate:"required""`
	UserID		primitive.ObjectID		`json:"user_id" bson:"user_id validate:"required""`
	Questions	[]Question				`json:"questions" bson:"user_id validate:"required""`
}



type Question struct {
    Marks    int    `json:"marks" bson:"marks" validate:"required"`
    Question string `json:"question" bson:"question" validate:"required"`
}
