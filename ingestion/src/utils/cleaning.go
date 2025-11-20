package utils

import (
	"regexp"
	"strings"
)

func CleanText(input string) string {
	text := input

	// 1. Remove page numbers (lines containing only digits)
	rePageNum := regexp.MustCompile(`(?m)^\s*\d+\s*$`)
	text = rePageNum.ReplaceAllString(text, "")

	// 2. Remove hyphenated line breaks (e.g., "respira-\ntion")
	reHyphens := regexp.MustCompile(`-\n`)
	text = reHyphens.ReplaceAllString(text, "")

	// 3. Replace single newlines inside sentences with space
	reBrokenLines := regexp.MustCompile(`\n(?=[a-z])`)
	text = reBrokenLines.ReplaceAllString(text, " ")

	// 4. Remove multiple newlines
	reMultiNewline := regexp.MustCompile(`\n+`)
	text = reMultiNewline.ReplaceAllString(text, "\n")

	// 5. Trim extra spaces
	reSpaces := regexp.MustCompile(`\s{2,}`)
	text = reSpaces.ReplaceAllString(text, " ")

	return strings.TrimSpace(text)
}


type UnitChunk struct {
	Unit    string `json:"unit"`
	Content string `json:"content"`
}

func SplitByUnits(text string) []UnitChunk {
	re := regexp.MustCompile(`(?i)(unit[\s\-:]*\d+|unit[\s\-:]*[ivx]+)`)
	matches := re.FindAllStringIndex(text, -1)

	var chunks []UnitChunk

	// No unit headings → return whole text as single chunk
	if len(matches) == 0 {
		chunks = append(chunks, UnitChunk{
			Unit:    "Unknown",
			Content: strings.TrimSpace(text),
		})
		return chunks
	}

	for i := 0; i < len(matches); i++ {
		end := len(text)

		if i+1 < len(matches) {
			end = matches[i+1][0]
		}

		unitLine := strings.TrimSpace(text[matches[i][0]:matches[i][1]])
		content := strings.TrimSpace(text[matches[i][1]:end])

		chunks = append(chunks, UnitChunk{
			Unit:    unitLine,
			Content: content,
		})
	}

	return chunks
}