package models

import(
	"time"
)

type User struct {
	ID            string    `json:"id" db:"id"` // UUID
	Name          string    `json:"name" db:"name"`
	Email         string    `json:"email" db:"email"`
	PasswordHash  string    `json:"password_hash" db:"password_hash"`
	Role          string    `json:"role" db:"role"`                               // student | teacher | admin
	Institution	  string   	`json:"institution,omitempty" db:"institution"` // nullable
	CreatedAt     time.Time	`json:"created_at" db:"created_at"`
	UpdatedAt     time.Time	`json:"updated_at" db:"updated_at"`
}

const (
	RoleStudent = "student"
	RoleTeacher = "teacher"
	RoleAdmin   = "admin"

	StatusActive   = "active"
	StatusInactive = "inactive"
	StatusBlocked  = "blocked"
)
