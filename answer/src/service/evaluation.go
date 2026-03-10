package service

import (
	"answer/src/grpcclient"
	"context"
	"fmt"
)

// EvaluationResponse for internal use
type EvaluationResponse struct {
	QuestionID    string
	ObtainedMarks int
	Feedback      string
	Success       bool
	Error         string
}



// EvaluateSingleTheory evaluates a single theory answer via gRPC
func EvaluateSingleTheory(
	ctx context.Context,
	questionID string,
	questionText string,
	answerText string,
	subject string,
	maxMarks int,
) (*EvaluationResponse, error) {

	response, err := grpcclient.EvaluateTheoryAnswer(
		ctx,
		questionID,
		questionText,
		answerText,
		subject,
		maxMarks,
		nil,
	)

	if err != nil {
		return nil, fmt.Errorf("gRPC evaluation failed: %w", err)
	}

	return &EvaluationResponse{
		QuestionID:    response.QuestionId,
		ObtainedMarks: int(response.ObtainedMarks),
		Feedback:      response.Feedback,
		Success:       response.Success,
		Error:         response.ErrorMessage,
	}, nil
}

