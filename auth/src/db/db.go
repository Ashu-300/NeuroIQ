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
