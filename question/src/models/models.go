package models

type TheoryQuestions struct {
	UserID    string           `json:"user_id" bson:"user_id" validate:"required"`
	Subject   string           `json:"subject" bson:"subject" validate:"required"`
	Semester  string           `json:"semester" bson:"semester" validate:"required"`
	Category  Category         `json:"category" bson:"category" validate:"required"`
	Questions []TheoryQuestion `json:"theory_questions" bson:"theory_questions" validate:"required"`
}

type TheoryQuestion struct {
	Marks    int    `json:"marks" bson:"marks" validate:"required"`
	Question string `json:"question" bson:"question" validate:"required"`
}

type MCQQuestions struct {
	UserID    string        `json:"user_id" bson:"user_id" validate:"required"`
	Subject   string        `json:"subject" bson:"subject" validate:"required"`
	Semester  string        `json:"semester" bson:"semester" validate:"required"`
	Category  Category      `json:"category" bson:"category" validate:"required"`
	Questions []MCQQuestion `json:"mcq_questions" bson:"mcq_questions" validate:"required"`
}

type BothQuestions struct {
	UserID         string           `json:"user_id" bson:"user_id" validate:"required"`
	Subject        string           `json:"subject" bson:"subject" validate:"required"`
	Semester       string           `json:"semester" bson:"semester" validate:"required"`
	Category       Category         `json:"category" bson:"category" validate:"required"`
	TheoryQuestions []TheoryQuestion `json:"theory_questions" bson:"theory_questions" validate:"required"`
	MCQQuestions    []MCQQuestion    `json:"mcq_questions" bson:"mcq_questions" validate:"required"`
}

type MCQQuestion struct {
	Question      string   `json:"question" bson:"question" validate:"required"`
	Options       []string `json:"options" bson:"options" validate:"required"`
	CorrectOption string   `json:"correct_option" bson:"correct_option" validate:"required"`
}

type Category string

const (
	CategoryMCQ    Category = "MCQ"
	CategoryTheory Category = "THEORY"
	CategoryBoth   Category = "BOTH"
)

type MCQExam struct {
	Subject      string        `json:"subject" bson:"subject" validate:"required"`
	Semester     string        `json:"semester" bson:"semester" validate:"required"`
	Category     Category      `json"category" bson:"category" validate"required"`
	QuestionList []MCQQuestion `json:"mcq_questions" bson:"mcq_questions" validate:"required"`
}

type TheoryExam struct {
	Subject      string           `json:"subject" bson:"subject" validate:"required"`
	Semester     string           `json:"semester" bson:"semester" validate:"required"`
	Category     Category         `json"category" bson:"category" validate"required"`
	QuestionList []TheoryQuestion `json:"mcq_questions" bson:"mcq_questions" validate:"required"`
}
