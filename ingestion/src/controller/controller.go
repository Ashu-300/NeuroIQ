package controller

import (
	"context"
	"encoding/json"
	"ingestion/src/db"
	"ingestion/src/middleware"
	"ingestion/src/model"
	"ingestion/src/service"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)



func UploadMaterial(w http.ResponseWriter, r *http.Request) {
	// Parse form (20 MB)
	r.ParseMultipartForm(20 << 20)

	subject := r.FormValue("subject")
	content := r.FormValue("content")
	role := r.FormValue("role")

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
	if subject == "" || content == "" || role == "" {
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
	cloudinaryURL, err := service.UploadPDF(file, header.Filename)
	if err != nil {
		http.Error(w, "failed uploading PDF to Cloudinary: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Reset file pointer for reading again (Cloudinary consumes it)
	_, err = file.Seek(0, 0)
	if err != nil {
		http.Error(w, "failed to reset file pointer", http.StatusInternalServerError)
		return
	}

	// ---------- 2️⃣ Read file bytes for extraction ----------
	// pdfBytes, err := io.ReadAll(file)
	// if err != nil {
	// 	http.Error(w, "failed reading file", http.StatusBadRequest)
	// 	return
	// }

	// ---------- 3️⃣ Extract raw text from PDF ----------
	// rawText, err := service.ExtractPdfFromBytes(pdfBytes)
	// if err != nil {
	// 	http.Error(w, "failed extracting text: "+err.Error(), http.StatusInternalServerError)
	// 	return
	// }

	// ---------- 4️⃣ Save Metadata + Cloudinary Link ----------
	doc := model.Content{
		Subject:      subject,
		Content:      content,
		// RawText:      rawText,
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
		"cloudinaryUrl": cloudinaryURL,
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
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(result),
		"data":    result,
	})


}