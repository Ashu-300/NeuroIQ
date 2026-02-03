package main

import (
	"ingestion/src/config"
	"ingestion/src/db"
	"os"

	// "ingestion/src/kafka"
	"ingestion/src/routes"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatalf("⚠️ error : %v", err.Error())
	}

	db.InitDB()
	config.InitCloudinary()
	config.UniPdfInit()
	// kafka.KafkaInit()

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

	router.Mount("/api/ingestion", routes.SetupIngestionRoutes())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8002"
	}

	log.Print("🚀 Ingestion service running on port " + port)
	err = http.ListenAndServe(":"+port, router)
	if err != nil {
		log.Printf("❌ error in running ingestion service")
	}
}
