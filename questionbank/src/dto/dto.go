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

type LlmRequestBody struct {
	Subject				string			`json:"subject" validate:"required"`
	UnitSyllabus    	string			`json:"unit_syllabus" validate:"required"`
	Num3Marks      		int				`json:"num_3marks"`
	Num4Marks     		int				`json:"num_4marks"`
	Num10Marks  		int				`json:"num_10marks"`
}

type LlmResponse struct {
	Success 		bool				`json:"success"`
	Questions	[]models.Question		`json:"questions"`
}