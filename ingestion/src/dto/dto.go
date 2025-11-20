package dto

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claim struct {
	ID            string
	Email         string 
	Role          string 
	jwt.RegisteredClaims
}

type TextChunkEvent struct {
	ChunkID    string    `json:"chunk_id"`
	Unit       string    `json:"unit"`
	Content    string    `json:"content"`
	Subject    string    `json:"subject"`
	TeacherID  string    `json:"teacher_id"`
	UploadedBy string    `json:"uploaded_by"`
	CreatedAt  time.Time `json:"created_at"`
}