package grpcclient

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	pb "answer/src/grpc/evaluation"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	client     pb.EvaluationServiceClient
	conn       *grpc.ClientConn
	clientOnce sync.Once
	clientErr  error
)

// GetLLMServiceAddress returns the LLM gRPC server address
func GetLLMServiceAddress() string {
	addr := os.Getenv("LLM_GRPC_ADDRESS")
	if addr == "" {
		addr = "localhost:50051"
	}
	return addr
}

// GetClient returns singleton gRPC client
func GetClient() (pb.EvaluationServiceClient, error) {

	clientOnce.Do(func() {

		addr := GetLLMServiceAddress()

		fmt.Printf("🔗 Connecting to LLM gRPC service at %s\n", addr)

		var err error
		conn, err = grpc.Dial(
			addr,
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)

		if err != nil {
			clientErr = fmt.Errorf("failed to connect to LLM service: %w", err)
			return
		}

		client = pb.NewEvaluationServiceClient(conn)

		fmt.Println("✅ Connected to LLM gRPC service")

	})

	if clientErr != nil {
		return nil, clientErr
	}

	return client, nil
}

// CloseConnection closes gRPC connection
func CloseConnection() error {
	if conn != nil {
		return conn.Close()
	}
	return nil
}

// EvaluateTheoryAnswer calls LLM service to evaluate theory answer
func EvaluateTheoryAnswer(
	ctx context.Context,
	questionID string,
	questionText string,
	answerText string,
	subject string,
	maxMarks int,
	expectedKeywords []string,
) (*pb.TheoryAnswerResponse, error) {

	c, err := GetClient()
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	req := &pb.TheoryAnswerRequest{
		QuestionId:       questionID,
		QuestionText:     questionText,
		AnswerText:       answerText,
		MaxMarks:         int32(maxMarks),
		Subject:          subject,
		ExpectedKeywords: expectedKeywords,
	}

	return c.EvaluateTheoryAnswer(ctx, req)
}

// EvaluateMCQAnswer calls LLM service for MCQ validation
func EvaluateMCQAnswer(
	ctx context.Context,
	questionID string,
	questionText string,
	options []string,
	selectedOption string,
	correctOption string,
	marks int,
) (*pb.MCQAnswerResponse, error) {

	c, err := GetClient()
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	req := &pb.MCQAnswerRequest{
		QuestionId:     questionID,
		QuestionText:   questionText,
		Options:        options,
		SelectedOption: selectedOption,
		CorrectOption:  correctOption,
		Marks:          int32(marks),
	}

	return c.EvaluateMCQAnswer(ctx, req)
}