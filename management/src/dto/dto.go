package dto

import (
	"management/src/models"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claim struct {
	ID    string
	Email string
	Role  string
	jwt.RegisteredClaims
}

type Prefix struct {
	Prefix   string `json:"prefix" validate:"required"`
	Branch   string `json:"branch" validate:"required"`
	Semester int    `json:"semester" validate:"required,min=1,max=8"`
}

type SeatingArrangementRequest struct {
	Students []models.Student `json:"students"`
	Rooms    []models.Room    `json:"rooms"`
}

type ScheduleExamRequest struct {
	ExamID      string    `json:"exam_id" validate:"required"`
	Title       string    `json:"title" validate:"required"`
	Subject     string    `json:"subject" validate:"required"`
	Branch      string    `json:"branch" validate:"required"`
	Semester    string    `json:"semester" validate:"required"`
	Date        time.Time `json:"date" validate:"required"` // YYYY-MM-DD
	StartTime   string    `json:"start_time" validate:"required"`
	EndTime     string    `json:"end_time" validate:"required"`
	DurationMin int       `json:"duration_min" validate:"required"`
	TotalMarks  int       `json:"total_marks" validate:"required"`
}

type UpdateExamTimeRequest struct {
	Date      time.Time `json:"date" validate:"required"`
	StartTime string    `json:"start_time" validate:"required"`
	EndTime   string    `json:"end_time" validate:"required"`
}
