package routes

import (
	"management/src/controller"
	"management/src/middleware"

	"github.com/go-chi/chi"
)

func SetupManagementRoutes() chi.Router{
	router := chi.NewRouter()
	
	router.Post("/register/room" , controller.RegisterRoom)
	router.Post("/register/multiple-room" , controller.RegisterMultipleRoom)
	router.Get("/get/rooms" , controller.GetRooms)
	router.Post("/mark/attendance" , controller.MarkAttendance)


	router.Group(func(r chi.Router){
		r.Use(middleware.AuthMiddleware)
		r.Post("/generate-seating-arrangement" , controller.GenerateSeatingArrangement)
	})

	return router
}