package jwtutil

import (
	"fmt"
	"os"
	"questionbank/src/dto"

	"github.com/golang-jwt/jwt/v5"
)


func ValidateToken(tokenString string) (*dto.Claim, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("missing JWT_SECRET")
	}

	var claim dto.Claim

	// Parse the token into our custom claim struct
	token, err := jwt.ParseWithClaims(
		tokenString,
		&claim,
		func(t *jwt.Token) (interface{}, error) {
			// Check if signing method is HS256
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("invalid signing method")
			}
			return []byte(secret), nil
		},
	)

	if err != nil {
		return nil, err // parsing or validation failed
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return &claim, nil
}
