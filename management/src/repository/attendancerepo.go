package repositories

import (
	"context"
	"management/src/db"
	"management/src/models"
)

// Mark attendance
func MarkAttendance(ctx context.Context, a models.Attendance) error {
	query := `
		INSERT INTO exam_attendance (exam_id, student_id, room_id, seat_no, status, answer_sheet_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (exam_id, student_id)
		DO UPDATE SET status = EXCLUDED.status, answer_sheet_id = EXCLUDED.answer_sheet_id
	`

	_, err := db.DB.Exec(ctx, query,
		a.ExamID, a.StudentID, a.RoomID, a.SeatNo, a.Status, a.AnswerSheetID,
	)
	return err
}

// Room-wise attendance
func GetAttendanceByRoom(ctx context.Context, examID, roomID string) ([]models.Attendance, error) {
	query := `
		SELECT id, exam_id, student_id, room_id, seat_no, status, answer_sheet_id
		FROM exam_attendance
		WHERE exam_id = $1 AND room_id = $2
		ORDER BY seat_no
	`

	rows, err := db.DB.Query(ctx, query, examID, roomID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Attendance

	for rows.Next() {
		var a models.Attendance
		err := rows.Scan(&a.ID, &a.ExamID, &a.StudentID, &a.RoomID, &a.SeatNo, &a.Status, &a.AnswerSheetID)
		if err != nil {
			return nil, err
		}
		list = append(list, a)
	}

	return list, nil
}

// Full attendance summary
func GetAttendanceByExam(ctx context.Context, examID string) ([]models.Attendance, error) {
	query := `
		SELECT id, exam_id, student_id, room_id, seat_no, status, answer_sheet_id
		FROM exam_attendance
		WHERE exam_id = $1
		ORDER BY room_id, seat_no
	`

	rows, err := db.DB.Query(ctx, query, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Attendance

	for rows.Next() {
		var a models.Attendance
		err := rows.Scan(&a.ID, &a.ExamID, &a.StudentID, &a.RoomID, &a.SeatNo, &a.Status, &a.AnswerSheetID)
		if err != nil {
			return nil, err
		}
		list = append(list, a)
	}

	return list, nil
}
