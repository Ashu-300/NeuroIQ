package dto

import (
	"github.com/golang-jwt/jwt/v5"
	// "go.mongodb.org/mongo-driver/bson/primitive"
)

type AccessClaim struct {
	ID    string
	Email string
	Role  string
	jwt.RegisteredClaims
}



// ============ Error Response ============
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}


type TheoryAnswerInput struct {
	QuestionID   string `json:"question_id" validate:"required"`
	QuestionText string `json:"question_text" validate:"required"`
	MaxMarks     int    `json:"max_marks" validate:"required"`
	AnswerText   string `json:"answer_text" validate:"required"`
}

type MCQAnswerInput struct {
	QuestionID     string   `json:"question_id" validate:"required"`
	QuestionText   string   `json:"question_text" validate:"required"`
	Options        []string `json:"options" validate:"required"`
	SelectedOption string   `json:"selected_option"`
	CorrectOption  string   `json:"correct_option" validate:"required"`
	Marks          int      `json:"marks" validate:"required"`
}

type SubmitExamAnswersRequest struct {
	ExamID        string             `json:"exam_id" validate:"required"`
	SessionID     string             `json:"session_id" validate:"required"`
	Subject       string             `json:"subject"`
	Semester      string             `json:"semester"`
	ExamType      string             `json:"exam_type"`
	TheoryAnswers []TheoryAnswerInput `json:"theory_answers,omitempty"`
	MCQAnswers    []MCQAnswerInput    `json:"mcq_answers,omitempty"`
}

type SubmitExamAnswersResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	SubmissionID string `json:"submission_id"`
}


