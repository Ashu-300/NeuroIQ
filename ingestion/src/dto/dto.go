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

type UnitChunk struct {
	Unit    string `json:"unit"`
	Content string `json:"content"`
}

type LlmRequestBody struct {
	Subject				string			`json:"subject" validate:"required"`
	Semester			string			`json:"semester" validation:"required"`
	UnitSyllabus    	string			`json:"unit_syllabus" validate:"required"`
	Num3Marks      		int				`json:"num_3marks"`
	Num4Marks     		int				`json:"num_4marks"`
	Num10Marks  		int				`json:"num_10marks"`
}

type Question struct {
    Marks    int    	`json:"marks" bson:"marks" `
    Question string 	`json:"question" bson:"question "`
}


type LlmResponse struct {
	Success 		bool				`json:"success"`
	Questions		[]Question			`json:"questions"`
}