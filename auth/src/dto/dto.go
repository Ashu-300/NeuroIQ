package dto

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type AccessClaim struct {
	ID            string
	Email         string 
	Role          string 
	jwt.RegisteredClaims
}

type RefreshClaim struct {
	ID            string
	jwt.RegisteredClaims
}

type RefreshTokenRequestDTO struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
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

type StudentFilterDTO struct {
	Prefix   string `json:"prefix" validate:"required"`
	Branch   string `json:"branch" validate:"required"`
	Semester int    `json:"semester" validate:"required,min=1,max=8"`
}


type StudentRegisterDTO struct {
	FirstName    string `json:"first_name" validate:"required"`
	LastName     string `json:"last_name" validate:"required"`

	RollNumber   string `json:"roll_number" validate:"required"`
	EnrollmentNo string `json:"enrollment_no" validate:"required"`

	Branch       string `json:"branch" validate:"required,oneof=CSE IT ECE MECH CIVIL EE EC"`
	Semester     int    `json:"semester" validate:"required,min=1,max=8"`
	Section      string `json:"section" validate:"omitempty"`

	Email        string `json:"email" validate:"required,email"`
	Phone        string `json:"phone" validate:"omitempty"`

	// UserID       string `json:"user_id" validate:"required"` // FK: user must exist before creating student
}