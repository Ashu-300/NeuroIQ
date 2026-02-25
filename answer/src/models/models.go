package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StudentExamAnswer struct {
	ExamID         primitive.ObjectID `bson:"exam_id" json:"exam_id"`
	StudentID      primitive.ObjectID `bson:"student_id" json:"student_id"`
	ExamSessionID  primitive.ObjectID `bson:"exam_session_id,omitempty" json:"exam_session_id,omitempty"`

	// 📚 Metadata
	Subject   string `bson:"subject" json:"subject"`
	Semester  string `bson:"semester" json:"semester"`
	ExamType  string `bson:"exam_type" json:"exam_type"`   // ONLINE / OFFLINE
	Category  string `bson:"category" json:"category"`     // THEORY / MCQ / BOTH

	// ⏱ Timing
	StartedAt      time.Time `bson:"started_at" json:"started_at"`
	SubmittedAt    time.Time `bson:"submitted_at,omitempty" json:"submitted_at,omitempty"`
	DurationMinute int       `bson:"duration_minutes" json:"duration_minutes"`

	// 🚨 Proctoring Summary
	ProctoringSummary *ProctoringSummary `bson:"proctoring_summary,omitempty" json:"proctoring_summary,omitempty"`

	// 🧾 Answers
	Answers AnswerSection `bson:"answers" json:"answers"`

	// 📊 Result
	ResultSummary *ResultSummary `bson:"result_summary,omitempty" json:"result_summary,omitempty"`

	// 🧾 Status
	Status string `bson:"status" json:"status"` // IN_PROGRESS / SUBMITTED / AUTO_SUBMITTED / EVALUATED

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}


type ProctoringSummary struct {
	TotalWarnings int                `bson:"total_warnings" json:"total_warnings"`
	AutoSubmitted bool               `bson:"auto_submitted" json:"auto_submitted"`
	Violations    []ProctorViolation `bson:"violations" json:"violations"`
}

type ProctorViolation struct {
	Type      string    `bson:"type" json:"type"` // MULTIPLE_FACES, LOOKING_AWAY, etc.
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
}

type AnswerSection struct {
	TheoryAnswers []TheoryAnswer `bson:"theory_answers,omitempty" json:"theory_answers,omitempty"`
	MCQAnswers    []MCQAnswer    `bson:"mcq_answers,omitempty" json:"mcq_answers,omitempty"`
}


type TheoryAnswer struct {
	QuestionID   primitive.ObjectID `bson:"question_id" json:"question_id"`
	QuestionText string             `bson:"question_text" json:"question_text"`

	MaxMarks int `bson:"max_marks" json:"max_marks"`

	AnswerText string `bson:"answer_text" json:"answer_text"`

	// Evaluation
	ObtainedMarks int    `bson:"obtained_marks,omitempty" json:"obtained_marks,omitempty"`
	Feedback      string `bson:"feedback,omitempty" json:"feedback,omitempty"`
}


type MCQAnswer struct {
	QuestionID   primitive.ObjectID `bson:"question_id" json:"question_id"`
	QuestionText string             `bson:"question_text" json:"question_text"`

	Options []string `bson:"options" json:"options"`

	SelectedOption string `bson:"selected_option" json:"selected_option"`
	CorrectOption  string `bson:"correct_option,omitempty" json:"correct_option,omitempty"`

	Marks     int  `bson:"marks" json:"marks"`
	IsCorrect bool `bson:"is_correct" json:"is_correct"`
}


type ResultSummary struct {
	TotalMarks    int     `bson:"total_marks" json:"total_marks"`
	ObtainedMarks int     `bson:"obtained_marks" json:"obtained_marks"`
	Percentage    float64 `bson:"percentage" json:"percentage"`
	Grade         string  `bson:"grade" json:"grade"`
}

