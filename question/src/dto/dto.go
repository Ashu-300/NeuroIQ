package dto

import (
	"questionbank/src/models"

	"github.com/golang-jwt/jwt/v5"
)

type Claim struct {
	ID    string
	Email string
	Role  string
	jwt.RegisteredClaims
}


type TheoryQuestions struct {
	Subject				string						`json:"subject" validate:"required"`
	Semester			string						`json:"semester" validate:"required"`
	QuestionList		[]models.TheoryQuestion		`json:"theory_questions"  validate:"required"`
}

type MCQQuestions struct {
	Subject				string					`json:"subject" validate:"required"`
	Semester			string					`json:"semester" validate:"required"`
	QuestionList		[]models.MCQQuestion	`json:"mcq_questions"  validate:"required"`
}

type LlmTheoryRequestBody struct {
	Subject				string			`json:"subject" validate:"required"`
	Semester			string			`json:"semester" validation:"required"`
	UnitSyllabus    	string			`json:"unit_syllabus" validate:"required"`
	Num3Marks      		int				`json:"num_3marks"`
	Num4Marks     		int				`json:"num_4marks"`
	Num10Marks  		int				`json:"num_10marks"`
}

type LlmMCQRequestBody struct {
	Subject				string			`json:"subject" validate:"required"`
	Semester			string			`json:"semester" validation:"required"`
	UnitSyllabus    	string			`json:"unit_syllabus" validate:"required"`
	NumMCQs      		int				`json:"num_mcqs"`
}

type LlmTheoryResponse struct {
	Success 		bool						`json:"success"`
	Questions		[]models.TheoryQuestion		`json:"questions"`
}

type LlmMCQResponse struct {
	Success 		bool					`json:"success"`
	Questions		[]models.MCQQuestion	`json:"questions"`
}

type MCQExam struct {
	Subject				string					`json:"subject" validate:"required"`
	Semester			string					`json:"semester" validate:"required"`
	Category			Category					`json:"category" validate:"required"`
	QuestionList		[]models.MCQQuestion	`json:"mcq_questions" validate:"required"`
}

type TheoryExam struct {
	Subject				string					`json:"subject" validate:"required"`
	Semester			string					`json:"semester" validate:"required"`
	Category			Category				`json:"category" validate:"required"`
	QuestionList		[]models.TheoryQuestion	`json:"mcq_questions" validate:"required"`
}
type Category string
const (
	CategoryMCQ    Category = "MCQ"
	CategoryTheory Category = "THEORY"
)

type QuestionRequest struct {
	Subject				string					`json:"subject" validate:"required"`
	Semester			string					`json:"semester" validate:"required"`
	Category			Category				`json:"category" validate:"required"`
}