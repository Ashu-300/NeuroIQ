package routes

import (
	"questionbank/src/controller"
	"questionbank/src/middleware"

	"github.com/go-chi/chi/v5"
)

func SetupQuestionbankRoutes() chi.Router{
	router := chi.NewRouter()

	router.Group(func(r chi.Router){
		r.Use(middleware.AuthMiddleware)
		r.Post("/register/questionset" , controller.RegisterQuestionSet)
	})

	return router
}