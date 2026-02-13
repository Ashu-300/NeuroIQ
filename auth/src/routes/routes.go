package routes

import (
	"auth/src/controller"
	"auth/src/middleware"

	"github.com/go-chi/chi/v5"
)

func SetuAuthRoutes() chi.Router {
	router := chi.NewRouter()

	router.Post("/signup" , controller.Signup)
	router.Post("/login" , controller.Login)
	router.Get("/get/studentlist" , controller.GetStudentsByPrefixBranchSemester)
	router.Post("/token/refresh" , controller.RefreshToken)
	router.Group(func (protected chi.Router){
		protected.Use(middleware.AuthMiddleware)
		protected.Post("/register/student" , controller.RegisterStudent)
		protected.Get("/get/user" , controller.GetUser)
		protected.Put("/update" , controller.UpdateUser)
		protected.Get("/get/student" , controller.GetStudentProfile)
	})

	return router
}