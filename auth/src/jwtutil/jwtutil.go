package jwtutil

import (
	"auth/src/dto"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken(userId string , email string , role string ) (string , error) {
	secret := os.Getenv("JWT_SECRET")
	claim := dto.Claim{
		ID: userId,
		Email: email,
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
    		IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256 , claim)
	signedToken , err := token.SignedString([]byte(secret))
	if err != nil {
		return "" , err
	}

	return signedToken , nil
}

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
