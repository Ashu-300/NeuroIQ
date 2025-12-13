package dto

import (
	"questionbank/src/models"

	"github.com/golang-jwt/jwt/v5"
)

type Claim struct {
	ID    string
	Email string
	Role  string
	jwt.RegisteredClaims
}


type Questions struct {
	QuestionList	[]models.Question		`json:"questions" bson:"questions validate:"required"`
}