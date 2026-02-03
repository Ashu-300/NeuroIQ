package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Room struct {
	RoomID           string `db:"room_id"`
	Rows             int    `db:"rows"`
	Columns          int    `db:"columns"`
	Branch   		 string `db:"branch"`
}

type Attendance struct {
	ID            int    `db:"id"`
	ExamID        string `db:"exam_id"`
	StudentID     string `db:"student_id"`
	RoomID        string `db:"room_id"`
	SeatNo        int    `db:"seat_no"`
	Status        string `db:"status"`
	AnswerSheetID string `db:"answer_sheet_id"`
}

type SeatingArragement struct {
	RoomID 					string					`bson:"room_id" json:"room_id"`
	Rows					int						`bson:"rows" json:"rows"`
	Columns					int						`bson:"columns" json:"columns"`
	StudentArragement		[][]string				`bson:"student_arragement" json:"student_arragement"`				
}

type SeatingArrangementList struct{
	ID 						primitive.ObjectID		`bson:"_id" json:"_id"`
	SeatingList				[]SeatingArragement		`bson:"seating_list" josn:"seating_list"`
}



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


type ScheduleExam struct {
	Title       	string    	`bson:"title" json:"title"`
	Subject     	string    	`bson:"subject" json:"subject"`
	Semester    	string    	`bson:"semester" json:"semester"`
	Date        	time.Time 	`bson:"date" json:"date"`
	StartTime   	string    	`bson:"start_time" json:"start_time"`
	EndTime     	string    	`bson:"end_time" json:"end_time"`
	DurationMin 	int       	`bson:"duration_min" json:"duration_min"`
	TotalMarks  	int       	`bson:"total_marks" json:"total_marks"`
	CreatedBy   	string    	`bson:"created_by" json:"created_by"`
	CreatedAt   	time.Time 	`bson:"created_at" json:"created_at"`
}