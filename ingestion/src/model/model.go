package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Content struct {
	ID        primitive.ObjectID 	`bson:"_id,omitempty" json:"id"`

	Subject   string             	`bson:"subject" json:"subject"`
	Content   string             	`bson:"content" json:"content"`
	// RawText   string             	`bson:"raw_text" json:"raw_text"`

	// New Fields
	UserID    string 				`bson:"user_id" json:"user_id"`
	Role      string             	`bson:"role" json:"role"`

	PDFUrl    string 				`bson:"pdfurl" json:"pdfurl"`

	CreatedAt time.Time          	`bson:"created_at" json:"created_at"`
}

