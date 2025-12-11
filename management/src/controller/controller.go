package controller

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"management/src/db"
	"management/src/dto"
	"management/src/models"
	"management/src/repository"
	"net/http"
	"os"
	"time"

	"github.com/go-playground/validator/v10"
)

func RegisterRoom(w http.ResponseWriter, r *http.Request) {
	//postgres
}

func RegisterMultipleRoom(w http.ResponseWriter, r *http.Request) {
	//postgres
}

func GetRooms(w http.ResponseWriter, r *http.Request) {
	//postgres
}

func GenerateSeatingArrangement(w http.ResponseWriter, r *http.Request) {
	
	ctx := r.Context()

	// api call to get student list based on first common roll number, semester and branch
	var prefix dto.Prefix

	if err := json.NewDecoder(r.Body).Decode(&prefix); err != nil {
		log.Printf("failed to decode prefix details: %v", err)
		http.Error(w, "failed to decode prefix details", http.StatusBadRequest)
		return
	}

	validate := validator.New()
	if err := validate.Struct(&prefix); err != nil {
		log.Printf("validation error: %v", err)
		http.Error(w, "validation error: "+err.Error(), http.StatusBadRequest)
		return
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	authURI := os.Getenv("AUTH_URI")
	if authURI == "" {
		log.Printf("AUTH_URI not configured")
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	authURI = authURI + "/get/studentlist"

	jsonPrefix, err := json.Marshal(prefix)
	if err != nil {
		log.Printf("failed to marshal prefix: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// preserve your GET usage but attach context and headers, and handle errors properly
	authReq, err := http.NewRequestWithContext(ctx, "GET", authURI, bytes.NewBuffer(jsonPrefix))
	if err != nil {
		log.Printf("error creating auth request: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	authReq.Header.Set("Accept", "application/json")
	authReq.Header.Set("Content-Type", "application/json") // keep header so receivers that expect it can parse

	authResp, err := client.Do(authReq)
	if err != nil {
		log.Printf("auth service request failed: %v", err)
		http.Error(w, "auth service request failed", http.StatusBadGateway)
		return
	}
	defer func() {
		if cerr := authResp.Body.Close(); cerr != nil {
			log.Printf("error closing auth response body: %v", cerr)
		}
	}()

	if authResp.StatusCode < 200 || authResp.StatusCode >= 300 {
		// forward auth service status and body
		w.Header().Set("Content-Type", authResp.Header.Get("Content-Type"))
		w.WriteHeader(authResp.StatusCode)
		if _, err := io.Copy(w, authResp.Body); err != nil {
			log.Printf("failed to forward auth error body: %v", err)
		}
		return
	}

	var studentList []models.Student
	if err := json.NewDecoder(authResp.Body).Decode(&studentList); err != nil {
		log.Printf("failed to decode student list from auth service: %v", err)
		http.Error(w, "failed to decode student list", http.StatusInternalServerError)
		return
	}

	//postgres to get room list
	rooms, err := repository.GetAllRooms(ctx)
	if err != nil {
		log.Printf("failed to fetch rooms: %v", err)
		http.Error(w, "failed to fetch rooms", http.StatusInternalServerError)
		return
	}

	// llm request to get seating arrangement
	seattingRequestBody := dto.SeatingArrangementRequest{
		Students: studentList,
		Rooms:   rooms,
	}

	jsonSeattingReq, err := json.Marshal(seattingRequestBody)
	if err != nil {
		log.Printf("failed to marshal seating request: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	llmURI := os.Getenv("LLM_URI")
	if llmURI == "" {
		log.Printf("LLM_URI not configured")
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	llmURI = llmURI + "/generate-seating-arrangement"

	seattingReq, err := http.NewRequestWithContext(ctx, "POST", llmURI, bytes.NewBuffer(jsonSeattingReq))
	if err != nil {
		log.Printf("failed to create LLM request: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	seattingReq.Header.Set("Content-Type", "application/json")
	seattingReq.Header.Set("Accept", "application/json")

	seatingResp, err := client.Do(seattingReq)
	if err != nil {
		log.Printf("LLM service request failed: %v", err)
		http.Error(w, "LLM service request failed", http.StatusBadGateway)
		return
	}
	defer func() {
		if cerr := seatingResp.Body.Close(); cerr != nil {
			log.Printf("error closing LLM response body: %v", cerr)
		}
	}()
	
	// save to mongodb
	var seatingArrangement []models.SeatingArragement
	err = json.NewDecoder(seatingResp.Body).Decode(&seatingArrangement)
	if err != nil {
		log.Printf("failed to decode seating list from auth service: %v", err)
		http.Error(w, "failed to decode student list", http.StatusInternalServerError)
		return
	}

	_ , err = db.GetSeatingCollection().InsertOne(ctx , seatingArrangement)
	if err != nil {
		log.Printf("failed to store seating list in mongodb: %v", err)
		http.Error(w , "Failed to store seating arrangement in db" , http.StatusInternalServerError)
	}

	// copy important headers (content-type) then forward status + body
	if ct := seatingResp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	} else {
		w.Header().Set("Content-Type", "application/json")
	}
	w.WriteHeader(seatingResp.StatusCode)

	if _, err := io.Copy(w, seatingResp.Body); err != nil {
		log.Printf("failed to copy LLM response body: %v", err)
	}
}
