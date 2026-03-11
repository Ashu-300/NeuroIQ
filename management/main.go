package main

import (
	"log"
	"management/src/db"
	"management/src/routes"
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/go-chi/cors"
)

func main() {
	

	db.PSQLInit()
	db.MongoDBInit()

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

	router.Mount("/api/management", routes.SetupManagementRoutes())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8004"
	}

	log.Printf("🚀 exam-management serivce listening on server %s", port)
	err := http.ListenAndServe(":"+port, router)
	if err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
