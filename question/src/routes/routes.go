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
		r.Post("/register/theory" , controller.RegisterTheoryQuestionSet)
		r.Post("/register/mcq" , controller.RegisterMCQQuestionSet)
		r.Post("/exam/generate/theory" , controller.GenerateTheoryExam)
		r.Post("/exam/generate/mcq" , controller.GenerateMCQExam)
		r.Get("/get/question" , controller.GetQuestion)

	})

	return router
} 