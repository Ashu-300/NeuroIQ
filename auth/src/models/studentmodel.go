package models

import "time"

type Student struct {
	ID        string `json:"id" db:"id"` // UUID
	FirstName string `json:"first_name" db:"first_name"`
	LastName  string `json:"last_name" db:"last_name"`

	RollNumber   string `json:"roll_number" db:"roll_number"`     // Unique per university/college
	EnrollmentNo string `json:"enrollment_no" db:"enrollment_no"` // Enrollment number

	Branch   string `json:"branch" db:"branch"`     // CSE, IT, ECE, MECH, CIVIL
	Semester int    `json:"semester" db:"semester"` // 1 to 8
	Section  string `json:"section" db:"section"`   // A, B, C (optional)

	Email string `json:"email" db:"email"`
	Phone string `json:"phone" db:"phone"`

	// Admin/Role level data
	UserID string `json:"user_id" db:"user_id"` // FK referencing user table if login exists
	Active bool   `json:"active" db:"active"`   // Is student active

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
