package controller

import (
	"encoding/json"
	"net/http"
	"questionbank/src/db"
	"questionbank/src/dto"
	"questionbank/src/middleware"
	"questionbank/src/models"

	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson/primitive"

)

func RegisterQuestionSet(w http.ResponseWriter , r *http.Request){
	authCtx , ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		http.Error(w , "Error in auth context" , http.StatusUnauthorized)
		return
	}
	ctx := r.Context()
	var questions dto.Questions
	err := json.NewDecoder(r.Body).Decode(&questions)
	if err != nil {
		http.Error(w , "request body not able to get decoded" , http.StatusBadRequest)
		return
	}

	validate := validator.New()
	err = validate.Struct(&questions)
	if err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	
	userObjectID , err := primitive.ObjectIDFromHex(authCtx.UserID)
	questionList := models.Questions{
		UserID: userObjectID,
		Questions: questions.QuestionList,
	}
	mongoRes , err := db.GetQuestionbankCollection().InsertOne(ctx , questionList)
	if err != nil {
		http.Error(w, "Database insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse := map[string]interface{}{
		"message" : "questions saveed to question bank",
		"mongo_response": mongoRes,
	}
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(jsonResponse)
}