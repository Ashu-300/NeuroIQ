package controller

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"questionbank/src/db"
	"questionbank/src/dto"
	"questionbank/src/middleware"
	"questionbank/src/models"
	"time"

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

	apiResp := map[string]interface{}{
		"message" : "questions saveed to question bank",
		"mongo_response": mongoRes,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(apiResp)
}

func GenrateQuestionFromText(w http.ResponseWriter , r *http.Request){
	var llmRequestBody dto.LlmRequestBody
	
	err := json.NewDecoder(r.Body).Decode(&llmRequestBody)
	if err != nil {
		http.Error(w , "Decoding error: "+err.Error() , http.StatusBadRequest)
		return
	}
	
	validate := validator.New()
	err = validate.Struct(&llmRequestBody)
	if err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	llmURI := os.Getenv("LLM_URI")
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	jsonLlmBody, err := json.Marshal(&llmRequestBody)
	if err != nil {
		http.Error(w , "error: "+err.Error() , http.StatusInternalServerError)
		return
	}
	llmEndPoint := llmURI + "/generate-questions"
	llmrReq, err := http.NewRequest("POST", llmEndPoint, bytes.NewBuffer(jsonLlmBody))
	llmResp, err := client.Do(llmrReq)
	if err != nil {
		http.Error(w, "error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var llmresponse dto.LlmResponse
	if err := json.NewDecoder(llmResp.Body).Decode(&llmresponse); err != nil {
		http.Error(w , "Decode error : "+err.Error() , http.StatusInternalServerError)
		return
	}

	apiResp := map[string]interface{}{
		"message":       "Material uploaded successfully",
		"success":		llmresponse.Sucess,
		"questions":	llmresponse.Questions,
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(apiResp)
}