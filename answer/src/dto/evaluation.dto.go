package dto

type TheoryEvaluationInput struct {
	QuestionID    string `json:"question_id" validate:"required"`
	ObtainedMarks int    `json:"obtained_marks" validate:"required"`
	MaxMarks      int    `json:"max_marks" validate:"required"`
	Feedback      string `json:"feedback"`
}

type MCQEvaluationInput struct {
	QuestionID    string `json:"question_id" validate:"required"`
	IsCorrect     bool   `json:"is_correct"`
	ObtainedMarks int    `json:"obtained_marks" validate:"required"`
	MaxMarks      int    `json:"max_marks" validate:"required"`
}

type SubmitEvaluationRequest struct {
	SubmissionID string `json:"submission_id" validate:"required"`
	ExamID       string `json:"exam_id" validate:"required"`
	StudentID    string `json:"student_id" validate:"required"`

	Subject  string `json:"subject"`
	Semester string `json:"semester"`
	ExamType string `json:"exam_type"`

	TheoryEvaluations []TheoryEvaluationInput `json:"theory_evaluations"`
	MCQEvaluations    []MCQEvaluationInput    `json:"mcq_evaluations"`
}

type SubmitEvaluationResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	EvaluationID string `json:"evaluation_id"`
}



type EvaluateTheoryRequest struct {
	QuestionID   string `json:"question_id" validate:"required"`
	QuestionText string `json:"question_text" validate:"required,min=5"`
	AnswerText   string `json:"answer_text" validate:"required,min=5"`
	Subject      string `json:"subject" validate:"required"`
	MaxMarks     int    `json:"max_marks" validate:"required,gt=0"`
}

type EvaluateTheoryResponse struct {
	QuestionID    string `json:"question_id"`
	ObtainedMarks int    `json:"obtained_marks"`
	Feedback      string `json:"feedback"`
}