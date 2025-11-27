package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Global DB Pool
var DB *pgxpool.Pool

// ConnectDB creates connection and initializes tables
func PSQLInit() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("❌ Failed to connect to DB: %v", err)
	}

	// Test connection
	err = pool.Ping(ctx)
	if err != nil {
		log.Fatalf("❌ Could not ping DB: %v", err)
	}

	DB = pool
	fmt.Println("✅ Connected to PostgreSQL")

	createTables()
}

// Create required tables
func createTables() {
	tables := []string{
		
		// 1. Rooms
		`CREATE TABLE IF NOT EXISTS rooms (
			room_id VARCHAR(50) PRIMARY KEY,
			capacity INT NOT NULL,
			rows INT NOT NULL,
			columns INT NOT NULL,
			restricted_branch TEXT,        -- Students of this branch cannot sit here
			created_at TIMESTAMP DEFAULT NOW()
		);`,

	

		// 2. Attendance table
		`CREATE TABLE IF NOT EXISTS exam_attendance (
			id SERIAL PRIMARY KEY,
			exam_id VARCHAR(50) NOT NULL,
			student_id VARCHAR(50) NOT NULL,
			room_id VARCHAR(50) NOT NULL,
			seat_no INT NOT NULL,
			status TEXT CHECK (status IN ('present', 'absent', 'malpractice')) NOT NULL,
			answer_sheet_id TEXT,
			timestamp TIMESTAMP DEFAULT NOW(),

			UNIQUE(exam_id, student_id)
		);`,
	}

	for _, query := range tables {
		_, err := DB.Exec(context.Background(), query)
		if err != nil {
			log.Fatalf("❌ Failed creating table: %v", err)
		}
	}

	fmt.Println("✅ All tables initialized")
}
