package jwtutil

import (
	"auth/src/dto"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken(userId string , email string , role string ) (string , string , error) {
	accessSecret := os.Getenv("JWT_ACCESS_SECRET")
	accessClaim := dto.AccessClaim{
		ID: userId,
		Email: email,
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
    		IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256 , accessClaim)
	signedAccessToken , err := accessToken.SignedString([]byte(accessSecret))
	if err != nil {
		return "", "" , err
	}

	refreshSecret := os.Getenv("JWT_REFRESH_SECRET")
	refreshClaim := dto.RefreshClaim{
		ID: userId,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
    		IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256 , refreshClaim)
	signedRefreshToken , err := refreshToken.SignedString([]byte(refreshSecret))
	if err != nil {
		return "" , "" , err
	}


	return signedAccessToken , signedRefreshToken , nil
}

func ValidateToken(tokenString string) (*dto.AccessClaim, error) {
	secret := os.Getenv("JWT_ACCESS_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("missing JWT_ACCESS_SECRET")
	}

	var claim dto.AccessClaim

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
