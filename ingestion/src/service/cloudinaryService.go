package service

import (
	"bytes"
	"context"
	

	"ingestion/src/config"

	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)


func UploadPDF(fileBytes []byte, fileName string) (string, error) {
	ctx := context.Background()

	

	reader := bytes.NewReader(fileBytes)



	uploadParams := uploader.UploadParams{
		ResourceType: "raw",      // MUST be raw
		Type:         "upload",
		Folder:       "pdf_files",
		PublicID:     fileName,
		Format:       "pdf",
	}

	uploadResult, err := config.Cloud.Upload.Upload(ctx, reader, uploadParams)
	if err != nil {
		return "", err
	}

	return uploadResult.SecureURL, nil
}
