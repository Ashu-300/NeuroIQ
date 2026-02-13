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
	router.Get("/get/scheduled-exams/branch/{branch}/semester/{semester}" , controller.GetScheduledExams)


	router.Group(func(r chi.Router){
		r.Use(middleware.AuthMiddleware)
		r.Post("/generate-seating-arrangement" , controller.GenerateSeatingArrangement)
		// schedule exam
		r.Post("/schedule/exam" , controller.ScheduleExam)
		r.Get("/get/exam-details/{scheduleID}" , controller.GetExamDetails)
		r.Delete("/delete/scheduled-exam/{scheduleID}" , controller.DeleteScheduledExam)
		r.Put("/update/exam-time/{scheduleID}", controller.UpdateExamTime)
	})

	return router
}