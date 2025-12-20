package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"ingestion/src/db"
	"ingestion/src/dto"
	"ingestion/src/kafka"
	"ingestion/src/middleware"
	"ingestion/src/model"
	"ingestion/src/service"
	"ingestion/src/utils"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)



func UploadMaterial(w http.ResponseWriter, r *http.Request) {
	// Parse form (20 MB)
	r.ParseMultipartForm(20 << 20)

	subject := r.FormValue("subject")
	role := r.FormValue("role")
	numberOf3marks , _ := strconv.Atoi(r.FormValue("num_3marks"))
	numberOf4marks , _ := strconv.Atoi(r.FormValue("num_4marks"))
	numberOf10marks , _ := strconv.Atoi(r.FormValue("num_10marks"))

	// Auth Context
	ctxValue := r.Context().Value(middleware.AuthKey)
	if ctxValue == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	authCtx, ok := ctxValue.(middleware.AuthContext)
	if !ok {
		http.Error(w, "invalid auth context", http.StatusUnauthorized)
		return
	}

	// Required fields
	if subject == "" || role == "" {
		http.Error(w, "subject, content, and role are required fields", http.StatusBadRequest)
		return
	}

	// Retrieve file
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	

	// ---------- 1️⃣ Upload PDF to Cloudinary ----------
	

	
	// Read file bytes BEFORE goroutine
	pdfBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "failed reading file", http.StatusBadRequest)
		return
	}

	var unitsContent []dto.UnitChunk


	// do extraction synchronously so you can return error to caller immediately
	rawText, err := service.ExtractPdfFromBytes(pdfBytes)
	if err != nil {
		log.Println("error extracting text:", err)
		http.Error(w, "Unable to get text from pdf", http.StatusBadRequest)
		return
	}

	cleanText := utils.CleanText(rawText)
	chunks := utils.SplitByUnits(cleanText)
	unitsContent = chunks
	client := &http.Client{
	}
	llmBaseURI := os.Getenv("LLM_URI")
	llmEndPoint := llmBaseURI + "/generate-questions"
	
	var questionList []interface{}
	var wg sync.WaitGroup
	var mu  sync.Mutex
	
	var firstErr error
	var errMu sync.Mutex
	log.Print(chunks[0])
	for _, val := range chunks {
		wg.Add(1)

		go func(val dto.UnitChunk) {
			defer wg.Done()

			// build request body
			llmRequest := dto.LlmRequestBody{
				Subject:      subject,
				UnitSyllabus: val.Content,
				Num3Marks:    numberOf3marks,
				Num4Marks:    numberOf4marks,
				Num10Marks:   numberOf10marks,
			}

			jsonBody, err := json.Marshal(&llmRequest)
			if err != nil {
				log.Printf("JSON marshal failed: %v", err)
				errMu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				errMu.Unlock()
				return
			}

			req, err := http.NewRequest("POST", llmEndPoint, bytes.NewBuffer(jsonBody))
			if err != nil {
				log.Printf("failed to create request: %v", err)
				errMu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				errMu.Unlock()
				return
			}
			req.Header.Set("Content-Type", "application/json")
			resp, err := client.Do(req)
			if err != nil {
				log.Printf("llm service request failed: %v", err)
				errMu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				errMu.Unlock()
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode < 200 || resp.StatusCode >= 300 {
				bodyBytes, _ := io.ReadAll(resp.Body)

				err = fmt.Errorf(
					"llm service error | status=%d | response=%s",
					resp.StatusCode,
					string(bodyBytes),
				)

				errMu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				errMu.Unlock()
				return
			}

			var llmresponse dto.LlmResponse
			if err := json.NewDecoder(resp.Body).Decode(&llmresponse); err != nil {
				log.Printf("decode error: %v", err)
				errMu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				errMu.Unlock()
				return
			}

			// append result safely
			mu.Lock()
			questionList = append(questionList, llmresponse)
			mu.Unlock()

		}(val)
	}

	wg.Wait()

	// If ANY goroutine returned an error → return HTTP error
	if firstErr != nil {
		log.Printf("processing failed: %v", firstErr)
		http.Error(w, "failed to generate questions:"+firstErr.Error(), http.StatusInternalServerError)
		return
	}

	cloudinaryURL, err := service.UploadPDF(pdfBytes, header.Filename)
	if err != nil {
		http.Error(w, "failed uploading PDF to Cloudinary: "+err.Error(), http.StatusInternalServerError)
		return
	}

	
	// ---------- 4️⃣ Save Metadata + Cloudinary Link ----------
	doc := model.Content{
		Subject:      subject,
		Content:      unitsContent,
		UserID:       authCtx.UserID,
		Role:         role,
		PDFUrl:       cloudinaryURL, // ⬅️ NEW FIELD
		CreatedAt:    time.Now(),
	}

	// Insert MongoDB
	res, err := db.GetIngestionCollection().InsertOne(r.Context(), doc)
	if err != nil {
		http.Error(w, "Database insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ---------- 5️⃣ Response ----------
	resp := map[string]interface{}{
		"message":       "Material uploaded successfully",
		"content_id":    res.InsertedID,
		"questions" : 	questionList,
		"cloudinaryUrl": cloudinaryURL,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(resp)
}


func GetMaterialByID(w http.ResponseWriter, r *http.Request) {
	// Context
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Extract ID from URL
	idParam := chi.URLParam(r, "id")
	if idParam == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	// Convert to ObjectID
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		http.Error(w, "invalid id format", http.StatusBadRequest)
		return
	}

	// Create filter
	filter := bson.M{"_id": objID}

	// Query MongoDB
	var result model.Content
	err = db.GetIngestionCollection().FindOne(ctx, filter).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			http.Error(w, "material not found", http.StatusNotFound)
			return
		}
		http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Send JSON response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusFound)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    result,
	})
}

func GetMaterialByUserID(w http.ResponseWriter, r *http.Request){
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()


	ctxValue := r.Context().Value(middleware.AuthKey)
	if ctxValue == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	authCtx, ok := ctxValue.(middleware.AuthContext)
	if !ok {
		http.Error(w, "invalid auth context", http.StatusUnauthorized)
		return
	}

	idParam := authCtx.UserID

	
	// Create filter
	filter := bson.M{"user_id": idParam}

	// Query MongoDB
	var result []model.Content
	cursor , err := db.GetIngestionCollection().Find(ctx, filter)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			http.Error(w, "material not found", http.StatusNotFound)
			return
		}
		http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	if err := cursor.All(ctx, &result); err != nil {
		http.Error(w, "failed to decode data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return as JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusFound)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(result),
		"data":    result,
	})


}


func UploadMaterialByID(w http.ResponseWriter , r *http.Request){
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Extract ID from URL
	idParam := chi.URLParam(r, "id")
	if idParam == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	authCtx , ok := r.Context().Value(middleware.AuthKey).(middleware.AuthContext)
	if !ok {
		log.Print("auth ctx not found")
		http.Error(w , "auth ctx not found" , http.StatusBadRequest)
		return
	}

	// Convert to ObjectID
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		http.Error(w, "invalid id format", http.StatusBadRequest)
		return
	}

	// Create filter
	filter := bson.M{"_id": objID}

	// Query MongoDB
	var result model.Content
	err = db.GetIngestionCollection().FindOne(ctx, filter).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			http.Error(w, "material not found", http.StatusNotFound)
			return
		}
		http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	producer := kafka.GetKafkaProducer()
	chunks := result.Content
	go func(chunks []dto.UnitChunk , producer *kafka.Producer) {
		for _, val := range chunks {
			chunkStruct := dto.TextChunkEvent{
				ChunkID:    uuid.New().String(),
				Unit:       val.Unit,
				Content:    val.Content,
				Subject:    result.Subject,
				TeacherID:  authCtx.UserID,
				UploadedBy: authCtx.Role,
				CreatedAt:  time.Now(),
			}
		

			if err := producer.SendJSON("syllabus", "unit", chunkStruct); err != nil {
				log.Println("failed to send message:", err)
			} else {
				log.Println("✔ Message sent!")
			}
		}
	}(chunks, producer)
	
	jsonResp := map[string]interface{}{
		"message":"material uploaded to ai for question generation",
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(jsonResp)
}