package controller

import (
	"answer/src/db"
	"answer/src/dto"
	"answer/src/models"
	"answer/src/service"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ============== Evaluation controllers ==============

func EvaluateSingleTheoryAnswer(w http.ResponseWriter, r *http.Request) {

	defer r.Body.Close()

	var req dto.EvaluateTheoryRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		http.Error(w, "Invalid JSON request body", http.StatusBadRequest)
		return
	}

	var validate = validator.New()

	// Validate DTO
	if err := validate.Struct(req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	result, err := service.EvaluateSingleTheory(
		ctx,
		req.QuestionID,
		req.QuestionText,
		req.AnswerText,
		req.Subject,
		req.MaxMarks,
	)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := dto.EvaluateTheoryResponse{
		QuestionID:    result.QuestionID,
		ObtainedMarks: result.ObtainedMarks,
		Feedback:      result.Feedback,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(response)
}

func StoreExamEvaluation(w http.ResponseWriter, r *http.Request) {

	var req dto.SubmitEvaluationRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	validate := validator.New()

	if err := validate.Struct(req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	submissionID, _ := primitive.ObjectIDFromHex(req.SubmissionID)
	examID, _ := primitive.ObjectIDFromHex(req.ExamID)

	var theoryEvaluations []models.TheoryEvaluation
	var mcqEvaluations []models.MCQEvaluation

	totalMarks := 0

	for _, t := range req.TheoryEvaluations {

		qID, err := primitive.ObjectIDFromHex(t.QuestionID)
		if err != nil {
			continue
		}

		theoryEvaluations = append(theoryEvaluations, models.TheoryEvaluation{
			QuestionID:    qID,
			ObtainedMarks: t.ObtainedMarks,
			MaxMarks:      t.MaxMarks,
			Feedback:      t.Feedback,
		})

		totalMarks += t.ObtainedMarks
	}

	for _, m := range req.MCQEvaluations {

		qID, err := primitive.ObjectIDFromHex(m.QuestionID)
		if err != nil {
			continue
		}

		mcqEvaluations = append(mcqEvaluations, models.MCQEvaluation{
			QuestionID:    qID,
			IsCorrect:     m.IsCorrect,
			ObtainedMarks: m.ObtainedMarks,
			MaxMarks:      m.MaxMarks,
		})

		totalMarks += m.ObtainedMarks
	}

	evaluation := models.StudentExamEvaluation{
		ID:           primitive.NewObjectID(),
		SubmissionID: submissionID,
		ExamID:       examID,
		StudentID:    req.StudentID,

		Subject:  req.Subject,
		Semester: req.Semester,
		ExamType: req.ExamType,

		Evaluation: models.EvaluationSection{
			TheoryEvaluations: theoryEvaluations,
			MCQEvaluations:    mcqEvaluations,
		},

		TotalMarks: totalMarks,

		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	result, err := db.GetEvaluationCollection().InsertOne(ctx, evaluation)

	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to store evaluation")
		return
	}

	respondJSON(w, http.StatusCreated, dto.SubmitEvaluationResponse{
		Success:      true,
		Message:      "Evaluation stored successfully",
		EvaluationID: result.InsertedID.(primitive.ObjectID).Hex(),
	})
}

func GetExamEvaluation(w http.ResponseWriter, r *http.Request) {

	examID := chi.URLParam(r, "exam_id")

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var evaluation map[string]interface{}
	err := db.GetEvaluationCollection().FindOne(ctx, bson.M{"exam_id": examID}).Decode(&evaluation)

	if err != nil {
		respondError(w, http.StatusNotFound, "Evaluation not found for the given exam ID")
		return
	}

	respondJSON(w, http.StatusOK, evaluation)
}

func GetStudentExamEvaluation(w http.ResponseWriter, r *http.Request) {
	examIDStr := chi.URLParam(r, "exam_id")
	studentID := chi.URLParam(r, "student_id")

	examID, err := primitive.ObjectIDFromHex(examIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid exam_id")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var evaluation map[string]interface{}
	err = db.GetEvaluationCollection().FindOne(ctx, bson.M{
		"exam_id":    examID,
		"student_id": studentID,
	}).Decode(&evaluation)

	if err != nil {
		respondError(w, http.StatusNotFound, "Evaluation not found")
		return
	}

	respondJSON(w, http.StatusOK, evaluation)
}
