package main

import (
	"auth/src/db"
	"auth/src/routes"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("⚠️ Error loading .env file:", err)
	}

	db.ConnectDB()

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

	router.Mount("/api/auth", routes.SetuAuthRoutes())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}
	log.Printf("🚀 Auth serivce listening on server %s", port)
	err = http.ListenAndServe(":"+port, router)
	if err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
