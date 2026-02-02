package main

import (
	"log"
	"management/src/db"
	"management/src/routes"
	"net/http"
	"os"

	"github.com/go-chi/chi"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load();
	if err != nil {
		log.Fatal("⚠️ Error loading .env file:", err);
	}

	db.PSQLInit()
	db.MongoDBInit()

	router := chi.NewRouter();

	router.Mount("/api/management" , routes.SetupManagementRoutes())

	port := os.Getenv("PORT");
	if port == "" {
		port = "8004"
	}

	log.Printf("🚀 exam-management serivce listening on server %s", port);
	err = http.ListenAndServe(":"+port, router);
	if err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
