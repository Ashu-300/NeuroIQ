package repositories

import (
	"context"
	"errors"
	"management/src/db"
	"management/src/models"

	"github.com/jackc/pgx/v5"
)

// Insert room
func CreateRoom(ctx context.Context, room models.Room) error {
	query := `
		INSERT INTO rooms (room_id, capacity, rows, columns, branch)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := db.DB.Exec(ctx, query,
		room.RoomID, room.Capacity, room.Rows, room.Columns, room.Branch,
	)
	return err
}

// Get all rooms
func GetAllRooms(ctx context.Context) ([]models.Room, error) {
	query := `SELECT room_id, capacity, rows, columns, branch FROM rooms`

	rows, err := db.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rooms []models.Room

	for rows.Next() {
		var rm models.Room
		err := rows.Scan(&rm.RoomID, &rm.Capacity, &rm.Rows, &rm.Columns, &rm.Branch)
		if err != nil {
			return nil, err
		}
		rooms = append(rooms, rm)
	}

	return rooms, nil
}

// Get room by ID
func GetRoomByID(ctx context.Context, roomID string) (*models.Room, error) {
	query := `
		SELECT room_id, capacity, rows, columns, branch 
		FROM rooms WHERE room_id = $1
	`

	var room models.Room
	err := db.DB.QueryRow(ctx, query, roomID).Scan(
		&room.RoomID, &room.Capacity, &room.Rows, &room.Columns, &room.Branch   ,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}

	return &room, err
}
