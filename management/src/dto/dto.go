package dto

import (
	"management/src/models"

	"github.com/golang-jwt/jwt/v5"
)

type Claim struct {
	ID string
	Email  string
	Role   string
	jwt.RegisteredClaims
}

type Prefix struct {
	Prefix   string 	`json:"prefix" validate:"required"`
	Branch   string 	`json:"branch" validate:"required"`
	Semester int    	`json:"semester" validate:"required,min=1,max=8"`
}

type SeatingArrangementRequest struct {
	Students	[]models.Student 		`json:"students"`
	Rooms 		[]models.Room			`json:"rooms"`
}