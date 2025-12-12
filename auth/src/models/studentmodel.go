package models

import "time"

type Student struct {
	ID        string `json:"id"` // UUID
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`

	RollNumber   string `json:"roll_number"`   // Unique per university/college

	Branch   string `json:"branch"`   // CSE, IT, ECE, MECH, CIVIL
	Semester int    `json:"semester"` // 1 to 8
	Section  string `json:"section"`  // A, B, C (optional)

	Email string `json:"email"`
	Phone string `json:"phone"`

	// Admin/Role level data
	UserID string `json:"user_id"` // FK referencing user table if login exists
	
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
