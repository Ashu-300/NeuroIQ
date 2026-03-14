package routes

import (
	"answer/src/controller"
	"answer/src/middleware"

	"github.com/go-chi/chi/v5"
)

func SetupAnswerRoutes() chi.Router {
	r := chi.NewRouter()

	// Public routes
	// None for now

	// Protected routes
	r.Group(func(protected chi.Router) {
		protected.Use(middleware.AuthMiddleware)


		// Submit mixed answers (both theory and MCQ in one request)
		protected.Post("/mixed/submit", controller.SubmitExamAnswers) // need

		// Get specific student submission for an exam
		protected.Get("/exam/{exam_id}/student/{student_id}/submission", controller.GetExamSubmission)
		
		// Evaluate single theory answer 
		protected.Post("/evaluate/theory", controller.EvaluateSingleTheoryAnswer)

		// Store exam evaluation results 
		protected.Post("/exam/evaluation", controller.StoreExamEvaluation)

		protected.Get("/exam/evaluation/{exam_id}", controller.GetExamEvaluation)

		// Get evaluation for specific student
		protected.Get("/exam/{exam_id}/student/{student_id}/evaluation", controller.GetStudentExamEvaluation)

		
	})

	return r
}
