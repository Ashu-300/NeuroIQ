package config

import (
	"log"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
)


var Cloud *cloudinary.Cloudinary

func GetCloudinaryCloud() *cloudinary.Cloudinary {
	return Cloud
}

func InitCloudinary() {
	cldURL := os.Getenv("CLOUDINARY_URL")
	if cldURL == "" {
		log.Fatal("❌ CLOUDINARY_URL is not set")
	}

	var err error
	Cloud, err = cloudinary.NewFromURL(cldURL)
	if err != nil {
		log.Fatalf("❌ Failed to initialize Cloudinary: %v", err)
	}


	log.Println("✅ Cloudinary initialized successfully")
}
