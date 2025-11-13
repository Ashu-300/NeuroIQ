package dto

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claim struct {
	ID            string
	Email         string 
	Role          string 
	jwt.RegisteredClaims
}

type UserRegisterDTO struct {
	Name          string  `json:"name" validate:"required"`
	Email         string  `json:"email" validate:"required,email"`
	Password      string  `json:"password" validate:"required,min=6"`
	Role          string  `json:"role" validate:"required,oneof=student teacher admin"`
	Institution   string  `json:"institution" validate:"required"`
}

type UserLoginDTO struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponseDTO struct{
	Name	string 	`json:"name"`
	Role 	string 	`json:"role"`
}


type UserResponseDTO struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Email         string     `json:"email"`
	Role          string     `json:"role"`
	Institution   string     `json:"institution"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}


type UserUpdateDTO struct {
	Name        *string `json:"name" validate:"omitempty,min=3"` // <--- explanation below
	Role        *string `json:"role" validate:"omitempty,oneof=student teacher admin"`
	Institution *string `json:"institution" validate:"required"`
}
