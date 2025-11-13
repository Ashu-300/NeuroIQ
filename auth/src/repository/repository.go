package repository

import (
	"time"

	"auth/src/models"
	"auth/src/db"

	"github.com/google/uuid"
)

func CreateUser(u *models.User) error {
	u.ID = uuid.New().String()
	u.CreatedAt = time.Now()
	u.UpdatedAt = time.Now()

	query := `
		INSERT INTO users (
			id, name, email, password_hash,
			role, institution,
			created_at, updated_at
		)
		VALUES (
			:id, :name, :email, :password_hash,
			:role, :institution,
			:created_at, :updated_at
		)
	`

	_, err := db.DB.NamedExec(query, u)
	return err
}


func GetUserByEmail(email string) (*models.User, error) {
	var user models.User

	err := db.DB.Get(&user, "SELECT * FROM users WHERE email=$1 LIMIT 1", email)
	if err != nil {
		return nil, err // err -> sql: no rows
	}

	return &user, nil
}

func GetUserByID(id string) (*models.User, error) {
	var user models.User

	query := `SELECT * FROM users WHERE id = $1 LIMIT 1`

	err := db.DB.Get(&user, query, id)
	if err != nil {
		return nil, err // sql: no rows → caller handles this
	}

	return &user, nil
}

func UpdateUser(u *models.User) error {
	query := `
		UPDATE users
		SET 
			name = :name,
			email = :email,
			password_hash = :password_hash,
			role = :role,
			institution = :institution,
			updated_at = :updated_at
		WHERE id = :id
	`
	_, err := db.DB.NamedExec(query, u)
	return err
}
