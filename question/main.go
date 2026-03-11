package main

import (
	"log"
	"net/http"
	"os"
	"questionbank/src/db"
	"questionbank/src/routes"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func main() {
	

	db.MongoInit()

	router := chi.NewRouter()

	// CORS middleware
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	router.Mount("/api/question", routes.SetupQuestionbankRoutes())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8005"
	}

	log.Printf("🚀 question serivce listening on server %s", port)
	err := http.ListenAndServe(":"+port, router)
	if err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
