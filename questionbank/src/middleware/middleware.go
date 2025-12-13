package middleware

import (
	"context"
	"net/http"
	"questionbank/src/dto"
	"questionbank/src/jwtutil"
	"strings"
)

type AuthContext struct {
	UserID string
	Email  string
	Role   string
	Claims *dto.Claim
}
type contextKey string

const AuthKey contextKey = "auth_context"

func AuthMiddleware(next http.Handler) (http.Handler) {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
			return
		}
		
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, "Invalid Authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		claims , err := jwtutil.ValidateToken(tokenString)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		authctx := AuthContext{
			UserID: 	claims.ID,
			Email: 		claims.Email,
			Role:  		claims.Role,
			Claims: 	claims,
		}
		ctx := context.WithValue(r.Context() , AuthKey , authctx)

		next.ServeHTTP(w , r.WithContext(ctx) )
	})
}