package controller

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
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
	}
	jsonLlmBody, err := json.Marshal(&llmRequestBody)
	if err != nil {
		http.Error(w , "error: "+err.Error() , http.StatusInternalServerError)
		return
	}
	llmEndPoint := llmURI + "/generate-questions"
	llmrReq, err := http.NewRequest("POST", llmEndPoint, bytes.NewBuffer(jsonLlmBody))
	llmrReq.Header.Set("Content-Type", "application/json")
	llmResp, err := client.Do(llmrReq)
	if err != nil {
		http.Error(w, "error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer llmResp.Body.Close()
	if llmResp.StatusCode < 200 || llmResp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(llmResp.Body)

		log.Printf(
			"LLM service error | status=%d | response=%s",
			llmResp.StatusCode,
			string(bodyBytes),
		)

		http.Error(
			w,
			fmt.Sprintf("LLM service failed with status %d", llmResp.StatusCode),
			http.StatusBadGateway, // upstream error
		)
		return
	}

	var llmresponse dto.LlmResponse
	if err := json.NewDecoder(llmResp.Body).Decode(&llmresponse); err != nil {
		http.Error(w , "LLM Decode error : "+err.Error() , http.StatusInternalServerError)
		return
	}

	apiResp := map[string]interface{}{
		"success":   llmresponse.Success,
		"message":   "Questions generated successfully",
		"questions": llmresponse.Questions,
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(apiResp)
}