package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type TheoryQuestions struct {
	ID 			primitive.ObjectID		`json:"_id" bson:"_id" validate:"required"`
	UserID		primitive.ObjectID		`json:"user_id" bson:"user_id" validate:"required"`
	Subject		string					`json:"subject" bson:"subject" validate:"required"`
	Semester	string					`json:"semester" bson:"semester" validate:"required"`
	Questions	[]TheoryQuestion		`json:"theory_questions" bson:"theory_questions" validate:"required"`
}



type TheoryQuestion struct {
    Marks    int    `json:"marks" bson:"marks" validate:"required"`
    Question string `json:"question" bson:"question" validate:"required"`
}


type MCQQuestions struct {
	ID 			primitive.ObjectID		`json:"_id" bson:"_id" validate:"required"`
	UserID		primitive.ObjectID		`json:"user_id" bson:"user_id" validate:"required"`
	Subject		string					`json:"subject" bson:"subject" validate:"required"`
	Semester	string					`json:"semester" bson:"semester" validate:"required"`
	Questions	[]MCQQuestion			`json:"mcq_questions" bson:"mcq_questions" validate:"required"`
}

type MCQQuestion struct {
	Question      string   `json:"question" bson:"question" validate:"required"`
	Options       []string `json:"options" bson:"options" validate:"required"`
	CorrectOption string   `json:"correct_option" bson:"correct_option" validate:"required"`
}

type Category string
const (
	CategoryMCQ 	Category = "MCQ"
	CategoryTheory	Category = "THEORY"
)
type MCQExam struct {
	Subject				string					`json:"subject" bson:"subject" validate:"required"`
	Semester			string					`json:"semester" bson:"semester" validate:"required"`
	Category			Category        		`json"category" bson:"category" validate"required"`
	QuestionList		[]MCQQuestion			`json:"mcq_questions" bson:"mcq_questions" validate:"required"`
}

type TheoryExam struct {
	Subject				string					`json:"subject" bson:"subject" validate:"required"`
	Semester			string					`json:"semester" bson:"semester" validate:"required"`
	Category			Category        		`json"category" bson:"category" validate"required"`
	QuestionList		[]TheoryQuestion			`json:"mcq_questions" bson:"mcq_questions" validate:"required"`
}