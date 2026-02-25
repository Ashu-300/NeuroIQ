package utils

import (
	"answer/src/dto"
	"fmt"
	"os"

	"github.com/golang-jwt/jwt/v5"
)



func ValidateToken(tokenString string) (*dto.AccessClaim, error) {
	secret := os.Getenv("JWT_ACCESS_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("missing JWT_ACCESS_SECRET")
	}

	var claim dto.AccessClaim

	token, err := jwt.ParseWithClaims(
		tokenString,
		&claim,
		func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("invalid signing method")
			}
			return []byte(secret), nil
		},
	)

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return &claim, nil
}