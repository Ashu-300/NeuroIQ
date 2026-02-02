package main

import (
	"log"
	"net/http"
	"os"
	"questionbank/src/db"
	"questionbank/src/routes"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("⚠️ Error loading .env file:", err)
	}

	db.MongoInit()

	router := chi.NewRouter()

	router.Mount("/api/question", routes.SetupQuestionbankRoutes())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8005"
	}

	log.Printf("🚀 question serivce listening on server %s", port)
	err = http.ListenAndServe(":"+port, router)
	if err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}