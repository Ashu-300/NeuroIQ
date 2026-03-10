package main

import (
	"answer/src/db"
	"answer/src/routes"
	"fmt"
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
		log.Println("⚠️ No .env file found, using environment variables")
	}

	db.MongoInit()

	router := chi.NewRouter()

	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Mount answer routes
	router.Mount("/api/answer", routes.SetupAuthRoutes())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8006"
	}

	fmt.Printf("🚀 Answer service running on port %s\n", port)
	err = http.ListenAndServe(":"+port, router)
	if err != nil {
		log.Fatal("⚠️ Error starting server:", err)
	}
}
