package utils

import (
	"ingestion/src/dto"
	"log"
	"regexp"
	"strings"
)

var (
	rePageNum       = regexp.MustCompile(`(?m)^\s*\d+\s*$`)
	reHyphens       = regexp.MustCompile(`-\n`)
	// replaced lookahead with capturing group ([a-z])
	reBrokenLines   = regexp.MustCompile(`\n([a-z])`)
	reMultiNewline  = regexp.MustCompile(`\n+`)
	reSpaces        = regexp.MustCompile(`\s{2,}`)
	reUnitHeadings  = regexp.MustCompile(`(?i)(unit[\s\-:]*\d+|unit[\s\-:]*[ivx]+)`)
)

func CleanText(input string) string {
	text := input

	// 1. Remove page numbers (lines containing only digits)
	text = rePageNum.ReplaceAllString(text, "")

	// 2. Remove hyphenated line breaks (e.g., "respira-\ntion")
	text = reHyphens.ReplaceAllString(text, "")

	// 3. Replace single newlines inside sentences with space
	//    previously: `\n(?=[a-z])` (unsupported). Now: `\n([a-z])` -> " $1"
	text = reBrokenLines.ReplaceAllString(text, " $1")

	// 4. Remove multiple newlines
	text = reMultiNewline.ReplaceAllString(text, "\n")

	// 5. Trim extra spaces
	text = reSpaces.ReplaceAllString(text, " ")

	return strings.TrimSpace(text)
}

func SplitByUnits(text string) []dto.UnitChunk {
	re := reUnitHeadings
	matches := re.FindAllStringIndex(text, -1)

	var chunks []dto.UnitChunk

	// No unit headings → return whole text as single chunk
	if len(matches) == 0 {
		chunks = append(chunks, dto.UnitChunk{
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

		chunks = append(chunks, dto.UnitChunk{
			Unit:    unitLine,
			Content: content,
		})
	}
	log.Print(chunks[0])
	return chunks
}
