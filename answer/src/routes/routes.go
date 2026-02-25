package routes

import (
	"answer/src/middleware"

	"github.com/go-chi/chi/v5"
)

func SetupAuthRoutes() chi.Router {
	r := chi.NewRouter()

	// Public routes


	// Protected routes
	r.Group(func(protected chi.Router) {
		protected.Use(middleware.AuthMiddleware)
		
	})

	return r
}