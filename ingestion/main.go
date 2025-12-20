package main

import (
	"ingestion/src/config"
	"ingestion/src/db"
	// "ingestion/src/kafka"
	"ingestion/src/routes"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatalf("⚠️ error : %v" , err.Error())
	}

	db.InitDB()
	config.InitCloudinary()
	config.UniPdfInit()
	// kafka.KafkaInit()
	
	
	router := chi.NewRouter();

	router.Mount("/api/ingestion" , routes.SetupIngestionRoutes());


	log.Print("🚀 Ingestion service running on port 8082");
	err = http.ListenAndServe(":8082" , router);
	if err != nil {
		log.Printf("❌ error in running ingestion service");
	}
}
