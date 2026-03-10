package controller

import (
	"answer/src/db"
	"answer/src/dto"
	"answer/src/middleware"
	"answer/src/models"
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"github.com/go-playground/validator/v10"
)

// ============ HELPER FUNCTIONS ============

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, dto.ErrorResponse{Error: message})
}


// ============ ANSWER CONTROLLERS ============

func SubmitExamAnswers(w http.ResponseWriter, r *http.Request) {

	authCtx, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req dto.SubmitExamAnswersRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	validate := validator.New()

	if err := validate.Struct(req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	examID, err := primitive.ObjectIDFromHex(req.ExamID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid exam_id")
		return
	}

	studentID := authCtx.UserID

	var theoryAnswers []models.TheoryAnswer
	var mcqAnswers []models.MCQAnswer

	// Convert Theory Answers DTO → Model
	for _, t := range req.TheoryAnswers {

		qID, err := primitive.ObjectIDFromHex(t.QuestionID)
		if err != nil {
			continue
		}

		theoryAnswers = append(theoryAnswers, models.TheoryAnswer{
			QuestionID:   qID,
			QuestionText: t.QuestionText,
			MaxMarks:     t.MaxMarks,
			AnswerText:   t.AnswerText,
		})
	}

	// Convert MCQ Answers DTO → Model
	for _, m := range req.MCQAnswers {

		qID, err := primitive.ObjectIDFromHex(m.QuestionID)
		if err != nil {
			continue
		}

		mcqAnswers = append(mcqAnswers, models.MCQAnswer{
			QuestionID:     qID,
			QuestionText:   m.QuestionText,
			Options:        m.Options,
			SelectedOption: m.SelectedOption,
			CorrectOption:  m.CorrectOption,
			Marks:          m.Marks,
			IsCorrect:      m.SelectedOption == m.CorrectOption,
		})
	}

	submission := models.StudentExamAnswer{
		ID:            primitive.NewObjectID(),
		ExamID:        examID,
		StudentID:     studentID,
		ExamSessionID: req.SessionID,
		Subject:       req.Subject,
		Semester:      req.Semester,
		ExamType:      req.ExamType,

		Answers: models.AnswerSection{
			TheoryAnswers: theoryAnswers,
			MCQAnswers:    mcqAnswers,
		},

		Status:    "SUBMITTED",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	result, err := db.GetAnswerCollection().InsertOne(ctx, submission)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save submission")
		return
	}

	respondJSON(w, http.StatusCreated, dto.SubmitExamAnswersResponse{
		Success:      true,
		Message:      "Answers submitted successfully",
		SubmissionID: result.InsertedID.(primitive.ObjectID).Hex(),
	})
}

func GetExamSubmission(w http.ResponseWriter, r *http.Request) {
	examIDStr := chi.URLParam(r, "exam_id")
	examID, err := primitive.ObjectIDFromHex(examIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid exam_id")
		return
	}
	studentID := chi.URLParam(r, "student_id")

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"exam_id":    examID,
		"student_id": studentID,
	}

	var submissionData map[string]interface{}
	err = db.GetAnswerCollection().FindOne(ctx, filter).Decode(&submissionData)
	if err != nil {
		respondError(w, http.StatusNotFound, "Submission not found")
		return
	}

	respondJSON(w, http.StatusOK, submissionData)
}










