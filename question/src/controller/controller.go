package controller

import (
	"context"
	"encoding/json"
	"net/http"
	"questionbank/src/db"
	"questionbank/src/dto"
	"questionbank/src/middleware"
	"questionbank/src/models"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson"
)

func RegisterTheoryQuestionSet(w http.ResponseWriter, r *http.Request) {
	authCtx, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		http.Error(w, "Error in auth context", http.StatusUnauthorized)
		return
	}
	ctx := r.Context()

	var questions dto.TheoryQuestions
	err := json.NewDecoder(r.Body).Decode(&questions)
	if err != nil {
		http.Error(w, "request body not able to get decoded:"+err.Error(), http.StatusInternalServerError)
		return
	}

	validate := validator.New()
	err = validate.Struct(&questions)
	if err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	questionList := models.TheoryQuestions{
		UserID:    authCtx.UserID,
		Subject:   strings.ToLower(strings.TrimSpace(questions.Subject)),
		Semester:  questions.Semester,
		Category:  models.CategoryTheory,
		Questions: questions.QuestionList,
	}

	mongoRes, err := db.GetQuestionbankCollection().InsertOne(ctx, questionList)
	if err != nil {
		http.Error(w, "Database insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	apiResp := map[string]interface{}{
		"message":        "questions saveed to question bank",
		"mongo_response": mongoRes,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(apiResp)
}

func RegisterMCQQuestionSet(w http.ResponseWriter, r *http.Request) {
	authCtx, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		http.Error(w, "Error in auth context", http.StatusUnauthorized)
		return
	}
	ctx := r.Context()

	var questions dto.MCQQuestions
	err := json.NewDecoder(r.Body).Decode(&questions)
	if err != nil {
		http.Error(w, "request body not able to get decoded", http.StatusBadRequest)
		return
	}

	validate := validator.New()
	err = validate.Struct(&questions)
	if err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	questionList := models.MCQQuestions{
		UserID:    authCtx.UserID,
		Subject:   strings.ToLower(strings.TrimSpace(questions.Subject)),
		Semester:  questions.Semester,
		Category:  models.CategoryMCQ,
		Questions: questions.QuestionList,
	}

	mongoRes, err := db.GetQuestionbankCollection().InsertOne(ctx, questionList)
	if err != nil {
		http.Error(w, "Database insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	apiResp := map[string]interface{}{
		"message":        "questions saveed to question bank",
		"mongo_response": mongoRes,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(apiResp)
}

func GenerateMCQExam(w http.ResponseWriter, r *http.Request) {
	var examRequest dto.MCQExam

	err := json.NewDecoder(r.Body).Decode(&examRequest)
	if err != nil {
		http.Error(w, "Decoding error: "+err.Error(), http.StatusBadRequest)
		return
	}
	validate := validator.New()
	err = validate.Struct(&examRequest)
	if err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	mongoRes, err := db.GetExamCollection().InsertOne(r.Context(), models.MCQExam{
		Subject:      examRequest.Subject,
		Semester:     examRequest.Semester,
		Category:     models.Category(examRequest.Category),
		QuestionList: examRequest.QuestionList,
	})
	if err != nil {
		http.Error(w, "Database insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	apiResp := map[string]interface{}{
		"message":        "MCQ exam saved successfully",
		"mongo_response": mongoRes,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(apiResp)
}

func GenerateTheoryExam(w http.ResponseWriter, r *http.Request) {
	var examRequest dto.TheoryExam

	err := json.NewDecoder(r.Body).Decode(&examRequest)
	if err != nil {
		http.Error(w, "Decoding error: "+err.Error(), http.StatusBadRequest)
		return
	}
	validate := validator.New()
	err = validate.Struct(&examRequest)
	if err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	mongoRes, err := db.GetExamCollection().InsertOne(r.Context(), models.TheoryExam{
		Subject:      examRequest.Subject,
		Semester:     examRequest.Semester,
		Category:     models.Category(examRequest.Category),
		QuestionList: examRequest.QuestionList,
	})
	if err != nil {
		http.Error(w, "Database insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	apiResp := map[string]interface{}{
		"message":        "Theory exam saved successfully",
		"mongo_response": mongoRes,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(apiResp)
}

func GenerateTheoryAndMCQExam(w http.ResponseWriter, r *http.Request) {
	authCtx, ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		http.Error(w, "Error in auth context", http.StatusUnauthorized)
		return
	}
	var examRequest dto.BothQuestions
	err := json.NewDecoder(r.Body).Decode(&examRequest)
	if err != nil {
		http.Error(w, "Decoding error: "+err.Error(), http.StatusBadRequest)
		return
	}
	validate := validator.New()
	err = validate.Struct(&examRequest)
	if err != nil {
		http.Error(w, "Validation error: "+err.Error(), http.StatusBadRequest)
		return
	}
	mongoRes, err := db.GetExamCollection().InsertOne(r.Context(), models.BothQuestions{
		UserID: 		authCtx.UserID,
		Subject:        examRequest.Subject,
		Semester:       examRequest.Semester,
		Category:       models.CategoryBoth,
		TheoryQuestions: examRequest.QuestionListTheory,
		MCQQuestions:    examRequest.QuestionListMCQ,
	})
	if err != nil {
		http.Error(w, "Database insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	apiResp := map[string]interface{}{
		"message":        "Both exam saved successfully",
		"mongo_response": mongoRes,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(apiResp)
}

func GetExam(w http.ResponseWriter, r *http.Request) {
	subject := chi.URLParam(r, "subject")
	semester := chi.URLParam(r, "semester")

	ctx , cancle := context.WithTimeout(context.Background() , 10*time.Second)
	defer cancle()

	collection := db.GetExamCollection()

	filter := bson.M{
		"subject" : subject,
		"semester" : semester,
	}
	cursor , err := collection.Find(ctx , filter)
	if err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var exams []models.BothQuestions
	if err := cursor.All(ctx , &exams); err != nil {
		http.Error(w, "Cursor error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	apiResp := map[string]interface{}{
		"message" : "Exams fetched successfully",
		"exams" : exams,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(apiResp)
}
	

func GetQuestion(w http.ResponseWriter, r *http.Request) {

	query := r.URL.Query()

	subject := strings.ToLower(strings.TrimSpace(query.Get("subject"))) // normalize to match stored format
	semester := query.Get("semester")                                   // "7"
	category := query.Get("category")                                   // "THEORY"

	// ✅ Build MongoDB filter
	filter := bson.M{
		"subject":  subject,
		"semester": semester,
		"category": category,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := db.GetQuestionbankCollection()

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var apiResp map[string]interface{}

	if category == "THEORY" {
		var questions []models.TheoryQuestions
		if err := cursor.All(ctx, &questions); err != nil {
			http.Error(w, "Cursor error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		apiResp = map[string]interface{}{
			"message":   "All questions fetched",
			"questions": questions,
		}
	} else {
		var questions []models.MCQQuestions
		if err := cursor.All(ctx, &questions); err != nil {
			http.Error(w, "Cursor error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		apiResp = map[string]interface{}{
			"message":   "All questions fetched",
			"questions": questions,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(apiResp)
}
