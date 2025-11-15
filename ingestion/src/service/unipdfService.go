package service

import (
	"bytes"
	"strings"

	"github.com/unidoc/unipdf/v4/extractor"
	"github.com/unidoc/unipdf/v4/model"
)

func ExtractPdfFromBytes(fileBytes []byte) (string, error) {
	reader := bytes.NewReader(fileBytes)

	pdfReader, err := model.NewPdfReader(reader)
	if err != nil {
		return "", err
	}

	numPages, err := pdfReader.GetNumPages()
	if err != nil {
		return "", err
	}

	var fullText strings.Builder

	for i := 1; i <= numPages; i++ {
		page, err := pdfReader.GetPage(i)
		if err != nil {
			return "", err
		}

		ex, err := extractor.New(page)
		if err != nil {
			return "", err
		}

		pageText, err := ex.ExtractText()
		if err != nil {
			return "", err
		}

		fullText.WriteString(pageText)
		fullText.WriteString("\n")
	}

	return fullText.String(), nil
}
