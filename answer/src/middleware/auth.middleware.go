package middleware

import (
	"context"
	"net/http"
	"strings"

	jwtutil "answer/src/util"
)

type contextKey string

const AuthKey contextKey = "auth_context"

type AuthContext struct {
	UserID string
	Email  string
	Role   string
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, "Invalid Authorization header", http.StatusUnauthorized)
			return
		}

		claims, err := jwtutil.ValidateToken(parts[1])
		if err != nil {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		authCtx := AuthContext{
			UserID: claims.UserID,
			Email:  claims.Email,
			Role:   claims.Role,
		}

		ctx := context.WithValue(r.Context(), AuthKey, authCtx)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}