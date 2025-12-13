package main

import (
	"log"
	"net/http"
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

	router.Mount("/api/questionbank", routes.SetupQuestionbankRoutes())

	log.Printf("🚀 question-bank serivce listening on server 8081")
	err = http.ListenAndServe(":8085", router)
	if err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}