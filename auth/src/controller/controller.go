package controller

import (
	"auth/src/dto"
	"auth/src/jwtutil"
	"auth/src/middleware"
	"auth/src/models"
	"auth/src/repository"
	"encoding/json"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"
	"github.com/go-playground/validator/v10"
)

func Signup(w http.ResponseWriter , r *http.Request){
	var user dto.UserRegisterDTO
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		http.Error(w , "Failed to decode user details" , http.StatusBadRequest)
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

	passwordHash , err := bcrypt.GenerateFromPassword([]byte(user.Password) , bcrypt.DefaultCost)
	if err != nil {
		http.Error(w , "failed to hash password" , http.StatusInternalServerError)
		return
	}
	user.Password = string(passwordHash)

	userDB := models.User{
		Name: user.Name,
		Email: user.Email,
		PasswordHash: user.Password,
		Role: user.Role,
		Institution: user.Institution,
	}

	err = repository.CreateUser(&userDB)
	if err != nil {
		http.Error(w , "failed to save user data in db" , http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated) // 201 Created

	json.NewEncoder(w).Encode(map[string]string{
		"message": "User data saved successfully",
	})

}

// 	authCtx, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
// 	if !ok {
// 		http.Error(w, "Unauthorized", http.StatusUnauthorized)
// 		return
// 	}
// 	// Example usage
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"message": "Protected route accessed",
// 		"user_id": authCtx.UserID,
// 		"email":   authCtx.Email,
// 		"role":    authCtx.Role,
// 	})
// }

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
	token, err := jwtutil.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Send response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "User logged in successfully",
		"token":   token,
		"User": dto.LoginResponseDTO{
			Name: user.Name,
			Role: user.Role,
		},
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
