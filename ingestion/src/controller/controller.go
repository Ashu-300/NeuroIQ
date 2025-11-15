package controller

import (
	"context"
	"encoding/json"
	"ingestion/src/db"
	"ingestion/src/middleware"
	"ingestion/src/model"
	"ingestion/src/service"
	"io"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)



func UploadMaterial(w http.ResponseWriter, r *http.Request) {
    // Parse form
    r.ParseMultipartForm(20 << 20)

	subject := r.FormValue("subject")
	content := r.FormValue("content")
	userID := r.FormValue("userid")
	role := r.FormValue("role")

	objID , err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		http.Error(w, "invalid id format", http.StatusBadRequest)
		return
	}

	if subject == "" || content == "" || userID == "" || role == "" {
		http.Error(w, "subject, content, userid, and role are required fields", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

    // Read file bytes
    pdfBytes, err := io.ReadAll(file)
    if err != nil {
        http.Error(w, "failed reading file", http.StatusBadRequest)
        return
    }

    // Extract text directly from bytes
    rawText, err := service.ExtractPdfFromBytes(pdfBytes)
    if err != nil {
        http.Error(w, "failed extracting text: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // Save rawText to MongoDB...
	doc := model.Content{
		Subject:   	subject,
		Content:   	content,
		RawText:   	rawText,
		UserID:    	objID,
		Role: 		role,
		CreatedAt: 	time.Now(),
	}

	// Insert into MongoDB
	res, err := db.GetIngestionCollection().InsertOne(r.Context(), doc)
	if err != nil {
		http.Error(w, "Database insert failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Final response
	resp := map[string]interface{}{
		"message":     "Material uploaded successfully",
		"content_id":  res.InsertedID,
		"raw_text_len": len(rawText),
	}

	w.Header().Set("Content-Type", "application/json")
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

	// Convert to ObjectID
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		http.Error(w, "invalid id format", http.StatusBadRequest)
		return
	}

	// Create filter
	filter := bson.M{"user_id": objID}

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
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(result),
		"data":    result,
	})


}