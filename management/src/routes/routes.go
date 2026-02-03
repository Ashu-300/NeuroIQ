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
		// schedule exam
		r.Post("/schedule/exam" , controller.ScheduleExam)
		r.Get("/get/scheduled-exams" , controller.GetScheduledExams)
		r.Get("/get/exam-details/{examID}" , controller.GetExamDetails)
		r.Delete("/delete/scheduled-exam/{examID}" , controller.DeleteScheduledExam)
		r.Put("/update/exam-time/{examID}", controller.UpdateExamTime)
	})

	return router
}