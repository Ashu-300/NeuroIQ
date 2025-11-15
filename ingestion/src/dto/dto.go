package dto

import (

	"github.com/golang-jwt/jwt/v5"
)

type Claim struct {
	ID            string
	Email         string 
	Role          string 
	jwt.RegisteredClaims
}

