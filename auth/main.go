package main

import (
	"auth/src/db"
	"auth/src/routes"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load();
	if err != nil {
		log.Fatal("⚠️ Error loading .env file:", err);
	}

	db.ConnectDB()

	router := chi.NewRouter();

	router.Mount("/api/auth" , routes.SetuAuthRoutes());

	log.Printf("🚀 Auth serivce listening on server 8081");
	err = http.ListenAndServe(":8081", router);
	if err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
