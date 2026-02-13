package controller

import (
	"auth/src/dto"
	"auth/src/jwtutil"
	"auth/src/middleware"
	"auth/src/models"
	"auth/src/repository"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func Signup(w http.ResponseWriter, r *http.Request) {
	var user dto.UserRegisterDTO
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		http.Error(w, "Failed to decode user details", http.StatusBadRequest)
		return
	}

	validate := validator.New()
	if err := validate.Struct(&user); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	existingUser, _ := repository.GetUserByEmail(user.Email)
	if existingUser != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict) // 409 Conflict
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Email already registered",
		})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "failed to hash password", http.StatusInternalServerError)
		return
	}
	user.Password = string(passwordHash)

	userDB := models.User{
		Name:         user.Name,
		Email:        user.Email,
		PasswordHash: user.Password,
		Role:         user.Role,
		Institution:  user.Institution,
	}

	err = repository.CreateUser(&userDB)
	if err != nil {
		http.Error(w, "failed to save user data in db", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated) // 201 Created

	json.NewEncoder(w).Encode(map[string]string{
		"message": "User data saved successfully",
	})

}

func RegisterStudent(w http.ResponseWriter, r *http.Request) {
	var student dto.StudentRegisterDTO

	authData, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Decode request body
	err := json.NewDecoder(r.Body).Decode(&student)
	if err != nil {
		http.Error(w, "Failed to decode student details", http.StatusBadRequest)
		return
	}

	// Validate incoming data
	validate := validator.New()
	if err := validate.Struct(&student); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Ensure referenced user exists
	user, _ := repository.GetUserByID(authData.UserID)
	if user == nil {
		http.Error(w, "User ID does not exist", http.StatusBadRequest)
		return
	}

	// Check if roll number already exists
	existingStudent, _ := repository.GetStudentByRoll(student.RollNumber)
	if existingStudent != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict) // 409 Conflict
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Roll number already registered",
		})
		return
	}

	// Create Student Model
	studentDB := models.Student{
		FirstName:    student.FirstName,
		LastName:     student.LastName,
		RollNumber:   student.RollNumber,
		EnrollmentNo: student.EnrollmentNo,
		Branch:       student.Branch,
		Semester:     student.Semester,
		Section:      student.Section,
		Email:        student.Email,
		Phone:        student.Phone,
		UserID:       authData.UserID,
		Active:       true,
	}

	// Save in DB
	err = repository.CreateStudent(&studentDB)
	if err != nil {
		http.Error(w, "Failed to save student data in DB", http.StatusInternalServerError)
		return
	}

	// Response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(map[string]string{
		"message": "Student registered successfully",
	})
}

func GetStudentProfile(w http.ResponseWriter, r *http.Request) {
	// 1. Get JWT claims from context
	authData, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	studentID := authData.UserID

	if authData.Role == "student" {
		http.Error(w, "Forbidden: You cannot access another student's profile", http.StatusForbidden)
		return
	}

	// 3. Fetch student from DB
	student, err := repository.GetStudentByID(studentID)
	if err != nil {
		http.Error(w, "Student not found", http.StatusNotFound)
		return
	}

	// 5. Return student
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(student)
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req dto.UserLoginDTO

	// Decode request body
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Fetch user by email
	user, err := repository.GetUserByEmail(req.Email)
	if err != nil || user == nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Compare password hash
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Generate JWT token
	accessToken, refreshToken, err := jwtutil.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":      "User logged in successfully",
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
		"User": dto.LoginResponseDTO{
			Name: user.Name,
			Role: user.Role,
		},
	})
}

func RefreshToken(w http.ResponseWriter, r *http.Request) {
	var refreshToken dto.RefreshTokenRequestDTO
	// Decode request body
	if err := json.NewDecoder(r.Body).Decode(&refreshToken); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	var claim dto.RefreshClaim
	refreshSecret := os.Getenv("JWT_REFRESH_SECRET")
	if refreshSecret == "" {
		http.Error(w, "JWT refresh secret not set", http.StatusInternalServerError)
		return
	}
	// Parse the token into our custom claim struct
	token, err := jwt.ParseWithClaims(
		refreshToken.RefreshToken,
		&claim,
		func(t *jwt.Token) (interface{}, error) {
			// Check if signing method is HS256
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("invalid signing method")
			}
			return []byte(refreshSecret), nil
		},
	)
	if err != nil || !token.Valid {
		http.Error(w, "Invalid or expired refresh token", http.StatusUnauthorized)
		return
	}
	user, err := repository.GetUserByID(claim.ID)
	if err != nil || user == nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}
	// Generate new access token
	newAccessToken, newRefreshToken, err := jwtutil.GenerateToken(claim.ID, user.Email, user.Role)
	if err != nil {
		http.Error(w, "Failed to generate new token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":      "User token refreshed  successfully",
		"accessToken":  newAccessToken,
		"refreshToken": newRefreshToken,
	})
}

func GetUser(w http.ResponseWriter, r *http.Request) {
	// Retrieve auth context (from middleware)
	authData, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := authData.UserID // logged-in user's ID

	// Fetch user from DB
	user, err := repository.GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Create response
	resp := dto.UserResponseDTO{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		Role:        user.Role,
		Institution: user.Institution,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func UpdateUser(w http.ResponseWriter, r *http.Request) {
	// Get logged-in user from auth context
	authData, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := authData.UserID

	// Parse incoming body
	var req dto.UserUpdateDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	validate := validator.New()
	if err := validate.Struct(&req); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Fetch existing user
	user, err := repository.GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Apply updates
	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.Role != nil {
		user.Role = *req.Role
	}
	if req.Institution != nil {
		user.Institution = *req.Institution
	}

	user.UpdatedAt = time.Now()

	// Update in DB
	if err := repository.UpdateUser(user); err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	// Response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User updated successfully",
	})
}

func GetStudentsByPrefixBranchSemester(w http.ResponseWriter, r *http.Request) {
	var filter dto.StudentFilterDTO

	// Decode JSON body
	err := json.NewDecoder(r.Body).Decode(&filter)
	if err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	// Validate
	validate := validator.New()
	if err := validate.Struct(&filter); err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Call repository
	students, err := repository.GetStudentsByPrefixBranchSemester(
		filter.Prefix,
		filter.Branch,
		filter.Semester,
	)
	if err != nil {
		http.Error(w, "Failed to fetch students", http.StatusInternalServerError)
		return
	}

	// Respond
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(students)
}
