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
	Subject				string			`json:"subject"`
	UnitSyllabus    	string			`json:"unit_syllabus"`
	Num3Marks      		int				`json:"num_3marks"`
	Num4Marks     		int				`json:"num_4marks"`
	Num10Marks  		int				`json:"num_5marks"`
}

type LlmResponse struct {
	Sucess 		bool	`json:"success"`
	Questions	string	`json:"questions"`
}