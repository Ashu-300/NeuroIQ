package dto

import "github.com/golang-jwt/jwt/v5"

type AccessClaim struct {
	UserID string 
	Email string
	Role  string
	jwt.RegisteredClaims
}