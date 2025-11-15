package service

import (
	"context"
	"errors"
	"fmt"
	"ingestion/src/config"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

// ------------------------
// Upload Image
// ------------------------

var Cloud = config.GetCloudinaryCloud()

func UploadImage(file multipart.File, filename string, folder string) (string, string, error) {
	if Cloud == nil {
		return "", "", errors.New("cloudinary not initialized")
	}

	ctx := context.Background()

	ext := strings.ToLower(filepath.Ext(filename)) // .jpg, .png, etc.

	publicID := folder + "/" + strings.TrimSuffix(filename, ext)

	uploadParams := uploader.UploadParams{
		Folder:   folder,
		PublicID: publicID,
	}

	res, err := Cloud.Upload.Upload(ctx, file, uploadParams)
	if err != nil {
		return "", "", err
	}

	// secure_url → to save in MongoDB  
	// public_id → needed for delete
	return res.SecureURL, res.PublicID, nil
}

// ------------------------
// Delete Image
// ------------------------
func DeleteImage(publicID string) error {
	if Cloud == nil {
		return errors.New("cloudinary not initialized")
	}

	ctx := context.Background()

	_, err := Cloud.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID: publicID,
	})

	if err != nil {
		return fmt.Errorf("failed to delete image: %v", err)
	}

	return nil
}
