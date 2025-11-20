package config

import (
	"log"
	"os"

	"github.com/unidoc/unipdf/v4/common/license"
)



func UniPdfInit() {
   
    key := os.Getenv("UNIDOC_LICENSE_API_KEY")
    keystr := string(key)
	err := license.SetMeteredKey(keystr)
	if err != nil {
		log.Printf("❌ error : %v" , err.Error())
	}
	log.Printf("✅ Connected to UNIPDF!")
}