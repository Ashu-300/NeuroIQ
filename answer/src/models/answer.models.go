package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StudentExamAnswer struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ExamID        primitive.ObjectID `bson:"exam_id" json:"exam_id"`
	StudentID     string             `bson:"student_id" json:"student_id"`
	ExamSessionID string             `bson:"exam_session_id" json:"exam_session_id"`

	Subject  string `bson:"subject" json:"subject"`
	Semester string `bson:"semester" json:"semester"`
	ExamType string `bson:"exam_type" json:"exam_type"`

	Answers AnswerSection `bson:"answers" json:"answers"`

	Status string `bson:"status" json:"status"`

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

type AnswerSection struct {
	TheoryAnswers []TheoryAnswer `bson:"theory_answers,omitempty" json:"theory_answers,omitempty"`
	MCQAnswers    []MCQAnswer    `bson:"mcq_answers,omitempty" json:"mcq_answers,omitempty"`
}

type TheoryAnswer struct {
	QuestionID   primitive.ObjectID `bson:"question_id" json:"question_id"`
	QuestionText string             `bson:"question_text" json:"question_text"`
	MaxMarks     int                `bson:"max_marks" json:"max_marks"`
	AnswerText   string             `bson:"answer_text" json:"answer_text"`
}

type MCQAnswer struct {
	QuestionID     primitive.ObjectID `bson:"question_id" json:"question_id"`
	QuestionText   string             `bson:"question_text" json:"question_text"`
	Options        []string           `bson:"options" json:"options"`
	SelectedOption string             `bson:"selected_option" json:"selected_option"`
	CorrectOption  string             `bson:"correct_option" json:"correct_option"`
	Marks          int                `bson:"marks" json:"marks"`
	IsCorrect      bool               `bson:"is_correct" json:"is_correct"`
}