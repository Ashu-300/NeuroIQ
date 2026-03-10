package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StudentExamEvaluation struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SubmissionID  primitive.ObjectID `bson:"submission_id" json:"submission_id"`
	ExamID        primitive.ObjectID `bson:"exam_id" json:"exam_id"`
	StudentID     string             `bson:"student_id" json:"student_id"`

	Subject  string `bson:"subject" json:"subject"`
	Semester string `bson:"semester" json:"semester"`
	ExamType string `bson:"exam_type" json:"exam_type"`

	Evaluation EvaluationSection `bson:"evaluation" json:"evaluation"`

	TotalMarks int `bson:"total_marks" json:"total_marks"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

type EvaluationSection struct {
	TheoryEvaluations []TheoryEvaluation `bson:"theory_evaluations,omitempty" json:"theory_evaluations,omitempty"`
	MCQEvaluations    []MCQEvaluation    `bson:"mcq_evaluations,omitempty" json:"mcq_evaluations,omitempty"`
}

type TheoryEvaluation struct {
	QuestionID    primitive.ObjectID `bson:"question_id" json:"question_id"`
	ObtainedMarks int                `bson:"obtained_marks" json:"obtained_marks"`
	MaxMarks      int                `bson:"max_marks" json:"max_marks"`
	Feedback      string             `bson:"feedback" json:"feedback"`
}

type MCQEvaluation struct {
	QuestionID    primitive.ObjectID `bson:"question_id" json:"question_id"`
	IsCorrect     bool               `bson:"is_correct" json:"is_correct"`
	ObtainedMarks int                `bson:"obtained_marks" json:"obtained_marks"`
	MaxMarks      int                `bson:"max_marks" json:"max_marks"`
}