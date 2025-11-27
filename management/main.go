package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load();
	if err != nil {
		log.Fatal("⚠️ Error loading .env file:", err);
	}

	

	router := chi.NewRouter();


	log.Printf("🚀 exam-management serivce listening on server 8081");
	err = http.ListenAndServe(":8084", router);
	if err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
