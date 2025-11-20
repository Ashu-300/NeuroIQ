package db

import (
	"fmt"
	"log"
	"os"

	"github.com/jmoiron/sqlx"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sqlx.DB

// ConnectDB connects to PostgreSQL
func ConnectDB() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set in environment")
	}

	var err error
	DB, err = sqlx.Connect("pgx", dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}

	fmt.Println("✅ Connected to PostgreSQL")

	createUsersTable()
	createStudentsTable()
}

// Auto create users table if not exists
func createUsersTable() {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		email VARCHAR(120) UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role VARCHAR(20) NOT NULL,
		institution VARCHAR(120) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);
	`
	_, err := DB.Exec(schema)
	if err != nil {
		log.Fatalf("❌ Failed to create users table: %v", err)
	}

	fmt.Println("✅ Users table ready")
}

func createStudentsTable() {
	schema := `
	CREATE TABLE IF NOT EXISTS students (
		id UUID PRIMARY KEY,
		first_name VARCHAR(100) NOT NULL,
		last_name VARCHAR(100) NOT NULL,

		roll_number VARCHAR(50) UNIQUE NOT NULL,
		enrollment_no VARCHAR(50) UNIQUE,

		branch VARCHAR(20) NOT NULL,        -- CSE/IT/ECE/MECH/etc
		semester INT NOT NULL CHECK (semester >= 1 AND semester <= 8),
		section VARCHAR(10),

		email VARCHAR(120) UNIQUE NOT NULL,
		phone VARCHAR(20),

		user_id UUID,                        -- FK to users table
		active BOOLEAN NOT NULL DEFAULT TRUE,

		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

		CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
	);

	CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);
	CREATE INDEX IF NOT EXISTS idx_students_semester ON students(semester);
	CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
	`
	_, err := DB.Exec(schema)
	if err != nil {
		log.Fatalf("❌ Failed to create students table: %v", err)
	}

	fmt.Println("✅ Students table ready")
}
