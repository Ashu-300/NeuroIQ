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



// CreateStudent inserts a new student into the database
func CreateStudent(s *models.Student) error {
	s.ID = uuid.New().String()
	s.CreatedAt = time.Now()
	s.UpdatedAt = time.Now()

	query := `
		INSERT INTO students (
			id,
			first_name,
			last_name,
			roll_number,
			enrollment_no,
			branch,
			semester,
			section,
			email,
			phone,
			user_id,
			active,
			created_at,
			updated_at
		)
		VALUES (
			:id,
			:first_name,
			:last_name,
			:roll_number,
			:enrollment_no,
			:branch,
			:semester,
			:section,
			:email,
			:phone,
			:user_id,
			:active,
			:created_at,
			:updated_at
		)
	`

	_, err := db.DB.NamedExec(query, s)
	return err
}

// GetStudentByRoll checks duplicate roll number
func GetStudentByRoll(roll string) (*models.Student, error) {
	var student models.Student

	query := `SELECT * FROM students WHERE roll_number = $1 LIMIT 1`

	err := db.DB.Get(&student, query, roll)
	if err != nil {
		return nil, err // sql: no rows → handled in controller
	}

	return &student, nil
}

// GetStudentByID fetches a student using primary key
func GetStudentByID(id string) (*models.Student, error) {
	var student models.Student

	query := `SELECT * FROM students WHERE id = $1 LIMIT 1`

	err := db.DB.Get(&student, query, id)
	if err != nil {
		return nil, err
	}

	return &student, nil
}


func GetStudentsByPrefixBranchSemester(prefix string, branch string, semester int) ([]models.Student, error) {
	var students []models.Student

	query := `
		SELECT *
		FROM students
		WHERE roll_number LIKE $1 || '%'
		AND branch = $2
		AND semester = $3
		ORDER BY roll_number ASC
	`

	err := db.DB.Select(&students, query, prefix, branch, semester)
	if err != nil {
		return nil, err
	}

	return students, nil
}
