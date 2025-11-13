package routes

import (
	"auth/src/controller"
	"auth/src/middleware"

	"github.com/go-chi/chi/v5"
)

func SetuAuthRoutes() chi.Router {
	router := chi.NewRouter()

	router.Post("/register" , controller.Signup)
	router.Post("/login" , controller.Login)

	router.Group(func (protected chi.Router){
		protected.Use(middleware.AuthMiddleware)
		protected.Get("/getuser" , controller.GetUser)
		protected.Put("/update" , controller.UpdateUser)
	})

	return router
}