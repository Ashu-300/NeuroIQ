package routes

import (
	"questionbank/src/controller"
	"questionbank/src/middleware"

	"github.com/go-chi/chi/v5"
)

func SetupQuestionbankRoutes() chi.Router{
	router := chi.NewRouter()

	router.Get("/exam/{id}" , controller.GetExamByID)
	
	router.Group(func(r chi.Router){
		r.Use(middleware.AuthMiddleware)
		r.Post("/register/theory" , controller.RegisterTheoryQuestionSet)
		r.Post("/register/mcq" , controller.RegisterMCQQuestionSet)
		r.Post("/exam/generate/theory" , controller.RegisterTheoryExam)
		r.Post("/exam/generate/mcq" , controller.RegisterMCQExam)
		r.Post("/exam/generate/both" , controller.RegisterTheoryAndMCQExam)
		r.Get("/exam/both/subject/{subject}/semester/{semester}" , controller.GetTheoryAndMCQExam)
		r.Get("/exam/theory/subject/{subject}/semester/{semester}" , controller.GetTheoryExam)
		r.Get("/exam/mcq/subject/{subject}/semester/{semester}" , controller.GetMCQExam)
		r.Get("/get/question" , controller.GetQuestion)

	})

	return router
} 