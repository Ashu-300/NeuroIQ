# Evaluation Feature Implementation Plan

This document outlines the complete implementation plan for adding the **Student Exam Evaluation** feature to the NeuroIQ system. The feature enables teachers to view students who attempted scheduled exams and evaluate their answers using the LLM service via gRPC.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Architecture Overview](#architecture-overview)
3. [Student Attempt List - Implementation Details](#student-attempt-list---implementation-details)
4. [Answer Service - New Routes and gRPC Client](#answer-service---new-routes-and-grpc-client)
5. [LLM Service - gRPC Server Implementation](#llm-service---grpc-server-implementation)
6. [Proto File Definition](#proto-file-definition)
7. [Frontend Changes](#frontend-changes)
8. [Database Considerations](#database-considerations)
9. [Implementation Checklist](#implementation-checklist)

---

## Feature Overview

### User Story
1. Teacher schedules an exam for specific branch/semester
2. Students attempt the exam (identity verification + proctored session + submission)
3. After the exam time ends (paper closed), teacher can:
   - View a list of all students who attempted the paper
   - Click "Evaluate" button next to each student's name
   - The system evaluates the student's theory answers using LLM
   - Results are updated and displayed

### Data Flow
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────►│  Answer Service │────►│   LLM Service   │
│ (Teacher Page)  │     │     (Go)        │     │   (Node.js)     │
│                 │◄────│                 │◄────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                       │                       │
       │                       │                       │
       ▼                       ▼                       ▼
  HTTP REST              gRPC (client)           gRPC (server)
```

---

## Architecture Overview

### Services Involved

| Service | Language | Role in Feature |
|---------|----------|-----------------|
| **Proctoring Service** | Python (FastAPI) | Stores exam sessions with `exam_id` and `student_id` |
| **Answer Service** | Go | Stores student answers, triggers evaluation, makes gRPC call to LLM |
| **LLM Service** | Node.js | Evaluates theory answers via Ollama, exposes gRPC server |
| **Management Service** | Go | Manages scheduled exams |
| **Auth Service** | Go | Provides student details (name, roll number, etc.) |

---

## Student Attempt List - Implementation Details

### Where Does the Data Live?

The student attempt data is distributed across multiple collections/services:

1. **Proctoring Service** (`exam_sessions` collection in MongoDB)
   - Contains: `session_id`, `student_id`, `exam_id`, `status`, `start_time`, `end_time`
   - This is created when a student starts an exam via `POST /api/proctoring/exam/start`

2. **Answer Service** (`student_exam_answers` collection in MongoDB)
   - Contains: Full student answer document with `exam_id`, `student_id`, `status`, `answers`, etc.
   - Created when student submits the exam

### Recommended Approach: Create API in Proctoring Service

Since the `proctoring` service already has the `exam_sessions` collection with all active/submitted sessions, it's the ideal place to add the student list API.

#### New Route in Proctoring Service

**File:** `proctoring/app/routes/exam_routes.py`

```
GET /api/proctoring/exam/{exam_id}/students
```

| Parameter | Type | Description |
|-----------|------|-------------|
| exam_id | string (path) | The scheduled exam ID |

**Response:**
```json
{
  "exam_id": "string",
  "total_students": 10,
  "students": [
    {
      "session_id": "uuid",
      "student_id": "uuid",
      "status": "submitted | active | auto_submitted",
      "start_time": "2025-01-01T10:00:00Z",
      "end_time": "2025-01-01T11:00:00Z",
      "identity_verified": true,
      "evaluation_status": "pending | in_progress | completed"
    }
  ]
}
```

> **Note:** The `evaluation_status` field can be fetched by joining with the Answer Service or adding a field to exam_sessions.

#### Repository Method to Add

**File:** `proctoring/app/db/repositories.py`

Add method in `ExamSessionRepository`:

```python
@classmethod
async def get_sessions_by_exam_id(cls, exam_id: str) -> List[ExamSession]:
    """Get all exam sessions for a specific exam"""
    cursor = cls.collection().find({"exam_id": exam_id})
    sessions = []
    async for doc in cursor:
        sessions.append(ExamSession(**doc))
    return sessions
```

#### Enriching with Student Details

To show student name/roll number, the proctoring service should make an internal call to the **Auth Service**:

```
GET /api/auth/get/studentlist
```

Or add a new endpoint:

```
GET /api/auth/students/{student_id}
```

This returns:
```json
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "roll_number": "2021CSE001",
  "branch": "CSE",
  "semester": 6
}
```

---

## Answer Service - New Routes and gRPC Client

The Answer Service needs new routes to handle evaluation requests and communicate with the LLM service via gRPC.

### File Structure Changes

```
answer/
├── go.mod
├── main.go
├── proto/                          # NEW - gRPC proto files
│   └── evaluation.proto
├── pb/                             # NEW - Generated Go code from proto
│   └── evaluation.pb.go
│   └── evaluation_grpc.pb.go
└── src/
    ├── controller/
    │   └── controller.go           # ADD: evaluation handlers
    ├── dto/
    │   └── dto.go                  # ADD: evaluation DTOs
    ├── grpc/                       # NEW - gRPC client
    │   └── llm_client.go
    ├── models/
    │   └── models.go               # Already has StudentExamAnswer
    ├── routes/
    │   └── routes.go               # ADD: new routes
    ├── service/                    # NEW - Service layer
    │   └── evaluation_service.go
    └── middleware/
        └── auth.middleware.go
```

### New Routes in Answer Service

**File:** `answer/src/routes/routes.go`

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| GET | `/api/answer/exam/{exam_id}/submissions` | Get all submissions for an exam | Yes (Teacher) |
| GET | `/api/answer/submission/{submission_id}` | Get specific submission details | Yes (Teacher) |
| POST | `/api/answer/submission/{submission_id}/evaluate` | Trigger LLM evaluation | Yes (Teacher) |
| GET | `/api/answer/submission/{submission_id}/result` | Get evaluation result | Yes |

### Route Definitions

```go
// Protected routes (Teacher only)
r.Group(func(protected chi.Router) {
    protected.Use(middleware.AuthMiddleware)
    
    // Get all submissions for an exam
    protected.Get("/exam/{examID}/submissions", controller.GetExamSubmissions)
    
    // Get specific submission details
    protected.Get("/submission/{submissionID}", controller.GetSubmissionDetails)
    
    // Trigger evaluation for a submission
    protected.Post("/submission/{submissionID}/evaluate", controller.EvaluateSubmission)
    
    // Get evaluation result
    protected.Get("/submission/{submissionID}/result", controller.GetEvaluationResult)
})
```

### New DTOs

**File:** `answer/src/dto/dto.go`

```go
package dto

// Request to trigger evaluation
type EvaluateRequest struct {
    SubmissionID string `json:"submission_id" validate:"required"`
}

// Response after triggering evaluation
type EvaluateResponse struct {
    SubmissionID string `json:"submission_id"`
    Status       string `json:"status"` // "evaluating" | "completed" | "failed"
    Message      string `json:"message"`
}

// Submission list item
type SubmissionListItem struct {
    SubmissionID     string    `json:"submission_id"`
    StudentID        string    `json:"student_id"`
    StudentName      string    `json:"student_name"`
    RollNumber       string    `json:"roll_number"`
    Status           string    `json:"status"` // SUBMITTED | EVALUATED
    SubmittedAt      time.Time `json:"submitted_at"`
    TotalMarks       int       `json:"total_marks,omitempty"`
    ObtainedMarks    int       `json:"obtained_marks,omitempty"`
    EvaluationStatus string    `json:"evaluation_status"` // pending | in_progress | completed
}

// Response for exam submissions list
type ExamSubmissionsResponse struct {
    ExamID      string               `json:"exam_id"`
    TotalCount  int                  `json:"total_count"`
    Submissions []SubmissionListItem `json:"submissions"`
}

// Evaluation result response
type EvaluationResultResponse struct {
    SubmissionID  string            `json:"submission_id"`
    StudentID     string            `json:"student_id"`
    TotalMarks    int               `json:"total_marks"`
    ObtainedMarks int               `json:"obtained_marks"`
    Percentage    float64           `json:"percentage"`
    TheoryResults []TheoryEvalResult `json:"theory_results"`
    MCQResults    MCQEvalResult     `json:"mcq_results"`
}

type TheoryEvalResult struct {
    QuestionID    string `json:"question_id"`
    QuestionText  string `json:"question_text"`
    Answer        string `json:"answer"`
    MaxMarks      int    `json:"max_marks"`
    ObtainedMarks int    `json:"obtained_marks"`
    Feedback      string `json:"feedback"`
}

type MCQEvalResult struct {
    TotalQuestions int `json:"total_questions"`
    CorrectAnswers int `json:"correct_answers"`
    TotalMarks     int `json:"total_marks"`
    ObtainedMarks  int `json:"obtained_marks"`
}
```

### gRPC Client Implementation

**File:** `answer/src/grpc/llm_client.go`

```go
package grpc

import (
    "context"
    "log"
    "os"
    "time"

    pb "answer/pb"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

type LLMClient struct {
    conn   *grpc.ClientConn
    client pb.EvaluationServiceClient
}

func NewLLMClient() (*LLMClient, error) {
    llmGRPCAddr := os.Getenv("LLM_GRPC_ADDRESS") // e.g., "localhost:50051"
    
    conn, err := grpc.Dial(
        llmGRPCAddr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        return nil, err
    }

    client := pb.NewEvaluationServiceClient(conn)
    return &LLMClient{conn: conn, client: client}, nil
}

func (c *LLMClient) Close() {
    c.conn.Close()
}

func (c *LLMClient) EvaluateTheoryAnswer(
    ctx context.Context,
    questionText string,
    studentAnswer string,
    maxMarks int32,
) (*pb.EvaluationResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
    defer cancel()

    req := &pb.EvaluationRequest{
        QuestionText:  questionText,
        StudentAnswer: studentAnswer,
        MaxMarks:      maxMarks,
    }

    return c.client.EvaluateTheoryAnswer(ctx, req)
}

func (c *LLMClient) EvaluateBatch(
    ctx context.Context,
    answers []*pb.TheoryAnswer,
) (*pb.BatchEvaluationResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 120*time.Second)
    defer cancel()

    req := &pb.BatchEvaluationRequest{
        Answers: answers,
    }

    return c.client.EvaluateBatch(ctx, req)
}
```

### Evaluation Service

**File:** `answer/src/service/evaluation_service.go`

```go
package service

import (
    "context"
    "answer/src/db"
    "answer/src/grpc"
    "answer/src/models"
    pb "answer/pb"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

type EvaluationService struct {
    llmClient *grpc.LLMClient
}

func NewEvaluationService() (*EvaluationService, error) {
    client, err := grpc.NewLLMClient()
    if err != nil {
        return nil, err
    }
    return &EvaluationService{llmClient: client}, nil
}

func (s *EvaluationService) EvaluateSubmission(
    ctx context.Context,
    submissionID string,
) error {
    // 1. Fetch submission from MongoDB
    objectID, err := primitive.ObjectIDFromHex(submissionID)
    if err != nil {
        return err
    }

    collection := db.GetStudentAnswersCollection()
    var submission models.StudentExamAnswer
    err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&submission)
    if err != nil {
        return err
    }

    // 2. Update status to IN_PROGRESS
    _, err = collection.UpdateOne(ctx, 
        bson.M{"_id": objectID},
        bson.M{"$set": bson.M{"status": "EVALUATING"}},
    )
    if err != nil {
        return err
    }

    // 3. Evaluate MCQ answers (local - compare selected with correct)
    mcqMarks := s.evaluateMCQ(submission.Answers.MCQAnswers)

    // 4. Evaluate Theory answers via gRPC
    theoryMarks, err := s.evaluateTheoryAnswers(ctx, submission.Answers.TheoryAnswers)
    if err != nil {
        return err
    }

    // 5. Calculate totals
    totalObtained := mcqMarks + theoryMarks
    // ... update result summary and status to EVALUATED

    return nil
}

func (s *EvaluationService) evaluateTheoryAnswers(
    ctx context.Context,
    answers []models.TheoryAnswer,
) (int, error) {
    var totalMarks int

    for _, answer := range answers {
        resp, err := s.llmClient.EvaluateTheoryAnswer(
            ctx,
            answer.QuestionText,
            answer.AnswerText,
            int32(answer.MaxMarks),
        )
        if err != nil {
            return 0, err
        }

        answer.ObtainedMarks = int(resp.GetMarks())
        answer.Feedback = resp.GetFeedback()
        totalMarks += answer.ObtainedMarks
    }

    return totalMarks, nil
}

func (s *EvaluationService) evaluateMCQ(answers []models.MCQAnswer) int {
    total := 0
    for _, ans := range answers {
        if ans.SelectedOption == ans.CorrectOption {
            ans.IsCorrect = true
            total += ans.Marks
        }
    }
    return total
}
```

---

## LLM Service - gRPC Server Implementation

The LLM service (Node.js) needs to add a gRPC server alongside the existing Express HTTP server.

### File Structure Changes

```
llm/
├── package.json                    # ADD: @grpc/grpc-js, @grpc/proto-loader
├── server.js                       # MODIFY: Start gRPC server alongside HTTP
├── proto/                          # NEW
│   └── evaluation.proto
└── src/
    ├── grpc/                       # NEW
    │   ├── server.js               # gRPC server implementation
    │   └── handlers/
    │       └── evaluation.handler.js
    └── service/
        └── evaluation.service.js   # NEW - LLM evaluation logic
```

### New Dependencies

Add to `llm/package.json`:

```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.9.0",
    "@grpc/proto-loader": "^0.7.10"
  }
}
```

### gRPC Server Implementation

**File:** `llm/src/grpc/server.js`

```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { evaluateTheoryAnswer, evaluateBatch } = require('./handlers/evaluation.handler');

const PROTO_PATH = path.join(__dirname, '../../proto/evaluation.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const evaluationProto = grpc.loadPackageDefinition(packageDefinition).evaluation;

function startGRPCServer(port = 50051) {
  const server = new grpc.Server();

  server.addService(evaluationProto.EvaluationService.service, {
    EvaluateTheoryAnswer: evaluateTheoryAnswer,
    EvaluateBatch: evaluateBatch,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error('gRPC server error:', err);
        return;
      }
      console.log(`gRPC server running on port ${boundPort}`);
      server.start();
    }
  );

  return server;
}

module.exports = { startGRPCServer };
```

### Evaluation Handler

**File:** `llm/src/grpc/handlers/evaluation.handler.js`

```javascript
const { evaluateAnswer } = require('../../service/evaluation.service');

async function evaluateTheoryAnswer(call, callback) {
  try {
    const { question_text, student_answer, max_marks } = call.request;

    const result = await evaluateAnswer(question_text, student_answer, max_marks);

    callback(null, {
      marks: result.marks,
      feedback: result.feedback,
      success: true,
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    callback(null, {
      marks: 0,
      feedback: 'Evaluation failed',
      success: false,
    });
  }
}

async function evaluateBatch(call, callback) {
  try {
    const { answers } = call.request;
    const results = [];

    for (const answer of answers) {
      const result = await evaluateAnswer(
        answer.question_text,
        answer.student_answer,
        answer.max_marks
      );
      results.push({
        question_id: answer.question_id,
        marks: result.marks,
        feedback: result.feedback,
      });
    }

    callback(null, { results, success: true });
  } catch (error) {
    console.error('Batch evaluation error:', error);
    callback(null, { results: [], success: false });
  }
}

module.exports = { evaluateTheoryAnswer, evaluateBatch };
```

### Evaluation Service (LLM Logic)

**File:** `llm/src/service/evaluation.service.js`

```javascript
const { generateLLMResponse } = require('./service');

async function evaluateAnswer(questionText, studentAnswer, maxMarks) {
  const prompt = `
You are an exam evaluator. Evaluate the following answer and give marks out of ${maxMarks}.

Question: ${questionText}

Student's Answer: ${studentAnswer}

Evaluate the answer based on:
1. Correctness of concepts
2. Completeness of explanation
3. Clarity of expression

Return ONLY valid JSON in this format:
{
  "marks": <number from 0 to ${maxMarks}>,
  "feedback": "<brief feedback explaining the marks given>"
}

Rules:
- Output MUST be valid JSON
- No markdown
- No explanations outside JSON
`;

  const response = await generateLLMResponse(prompt);
  
  try {
    // Extract JSON from response
    const start = response.indexOf('{');
    const end = response.lastIndexOf('}');
    const jsonText = response.slice(start, end + 1);
    const result = JSON.parse(jsonText);

    return {
      marks: Math.min(result.marks, maxMarks),
      feedback: result.feedback || 'No feedback provided',
    };
  } catch (err) {
    console.error('Failed to parse evaluation response:', response);
    return {
      marks: 0,
      feedback: 'Evaluation parsing failed',
    };
  }
}

module.exports = { evaluateAnswer };
```

---

## Proto File Definition

Create identical proto files in both services.

**File:** `answer/proto/evaluation.proto` AND `llm/proto/evaluation.proto`

```protobuf
syntax = "proto3";

package evaluation;

option go_package = "answer/pb";

// Service definition
service EvaluationService {
  // Evaluate a single theory answer
  rpc EvaluateTheoryAnswer(EvaluationRequest) returns (EvaluationResponse);
  
  // Evaluate multiple answers in batch
  rpc EvaluateBatch(BatchEvaluationRequest) returns (BatchEvaluationResponse);
}

// Request for single evaluation
message EvaluationRequest {
  string question_id = 1;
  string question_text = 2;
  string student_answer = 3;
  int32 max_marks = 4;
}

// Response for single evaluation
message EvaluationResponse {
  int32 marks = 1;
  string feedback = 2;
  bool success = 3;
}

// Request for batch evaluation
message BatchEvaluationRequest {
  repeated TheoryAnswer answers = 1;
}

// Single theory answer for batch
message TheoryAnswer {
  string question_id = 1;
  string question_text = 2;
  string student_answer = 3;
  int32 max_marks = 4;
}

// Response for batch evaluation
message BatchEvaluationResponse {
  repeated AnswerResult results = 1;
  bool success = 2;
}

// Result for single answer in batch
message AnswerResult {
  string question_id = 1;
  int32 marks = 2;
  string feedback = 3;
}
```

### Generating Go Code from Proto

Run in `answer/` directory:

```bash
# Install protoc and Go plugins if not already installed
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate Go code
protoc --go_out=. --go-grpc_out=. proto/evaluation.proto
```

Add to `answer/go.mod`:

```go
require (
    google.golang.org/grpc v1.60.0
    google.golang.org/protobuf v1.32.0
)
```

---

## Frontend Changes

### Teacher Section - Scheduled Exams Page

**File:** `neuroIQ_frontend/src/pages/teacher/ScheduledExamsPage.jsx`

Add a new button "View Attempts" for each scheduled exam (shown when exam is closed).

### New Components Needed

1. **StudentAttemptsModal.jsx** or **StudentAttemptsPage.jsx**
   - Displays list of students who attempted the exam
   - Shows: Student Name, Roll Number, Status, Submitted Time
   - "Evaluate" button next to each student (for SUBMITTED status)
   - "View Result" button (for EVALUATED status)

2. **EvaluationResultModal.jsx**
   - Shows detailed evaluation result
   - Theory answers with marks and feedback
   - MCQ summary

### New API Functions

**File:** `neuroIQ_frontend/src/api/answer.api.js` (NEW FILE)

```javascript
import api from './axios';

// Get all submissions for an exam
export const getExamSubmissions = async (examId) => {
  const response = await api.get(`/api/answer/exam/${examId}/submissions`);
  return response.data;
};

// Trigger evaluation for a submission
export const evaluateSubmission = async (submissionId) => {
  const response = await api.post(`/api/answer/submission/${submissionId}/evaluate`);
  return response.data;
};

// Get evaluation result
export const getEvaluationResult = async (submissionId) => {
  const response = await api.get(`/api/answer/submission/${submissionId}/result`);
  return response.data;
};
```

### UI Flow

```
ScheduledExamsPage
    │
    ├── [View Attempts] button (appears after exam end time)
    │         │
    │         ▼
    │   StudentAttemptsPage / Modal
    │         │
    │         ├── Student Row: "John Doe | 2021CSE001 | Submitted | [Evaluate]"
    │         │         │
    │         │         ▼ (click Evaluate)
    │         │   Loading... → Updates to "Evaluated"
    │         │
    │         └── Student Row: "Jane Doe | 2021CSE002 | Evaluated | [View Result]"
    │                   │
    │                   ▼ (click View Result)
    │             EvaluationResultModal
    │
    └── Existing buttons: [View Details] [Edit Time] [Delete]
```

---

## Database Considerations

### Existing Collections Used

1. **exam_sessions** (Proctoring Service - MongoDB)
   - Already has: `exam_id`, `student_id`, `status`
   - Needed for: Getting list of students who attempted

2. **student_exam_answers** (Answer Service - MongoDB)
   - Already has: Full answer model with `status`, `result_summary`
   - Add field: `evaluation_status`: `"pending" | "in_progress" | "completed" | "failed"`

### Schema Addition to StudentExamAnswer

**File:** `answer/src/models/models.go`

Add field:

```go
type StudentExamAnswer struct {
    // ... existing fields ...
    
    // Add this field
    EvaluationStatus string `bson:"evaluation_status" json:"evaluation_status"` // pending | in_progress | completed | failed
}
```

---

## Implementation Checklist

### Phase 1: Student Attempts List

- [ ] **Proctoring Service**
  - [ ] Add `get_sessions_by_exam_id()` repository method
  - [ ] Add `GET /api/proctoring/exam/{exam_id}/students` route
  - [ ] Add controller and service logic
  - [ ] Integrate with Auth service to get student details

### Phase 2: Answer Service Routes

- [ ] **Answer Service**
  - [ ] Create `proto/evaluation.proto`
  - [ ] Generate Go code from proto (`pb/` folder)
  - [ ] Add gRPC dependencies to `go.mod`
  - [ ] Create `src/grpc/llm_client.go`
  - [ ] Create `src/service/evaluation_service.go`
  - [ ] Add new DTOs in `src/dto/dto.go`
  - [ ] Add routes:
    - [ ] `GET /api/answer/exam/{examID}/submissions`
    - [ ] `GET /api/answer/submission/{submissionID}`
    - [ ] `POST /api/answer/submission/{submissionID}/evaluate`
    - [ ] `GET /api/answer/submission/{submissionID}/result`
  - [ ] Add controller handlers
  - [ ] Add `evaluation_status` field to model

### Phase 3: LLM Service gRPC Server

- [ ] **LLM Service**
  - [ ] Add gRPC dependencies to `package.json`
  - [ ] Create `proto/evaluation.proto`
  - [ ] Create `src/grpc/server.js`
  - [ ] Create `src/grpc/handlers/evaluation.handler.js`
  - [ ] Create `src/service/evaluation.service.js`
  - [ ] Update `server.js` to start gRPC server

### Phase 4: Frontend Integration

- [ ] **Frontend**
  - [ ] Create `src/api/answer.api.js`
  - [ ] Modify `ScheduledExamsPage.jsx`:
    - [ ] Add "View Attempts" button (visible after exam end time)
  - [ ] Create `StudentAttemptsPage.jsx` or modal:
    - [ ] Display student list
    - [ ] Evaluate button functionality
    - [ ] View Result button functionality
  - [ ] Create `EvaluationResultModal.jsx`

### Phase 5: Environment & Configuration

- [ ] Add environment variables:
  - [ ] `LLM_GRPC_ADDRESS` in Answer Service (e.g., `llm:50051`)
  - [ ] `GRPC_PORT` in LLM Service (e.g., `50051`)

### Phase 6: Testing

- [ ] Test gRPC connection between Answer and LLM services
- [ ] Test evaluation with sample theory answers
- [ ] Test frontend flow end-to-end
- [ ] Load testing for batch evaluations

---

## API Summary

### Proctoring Service (New)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/proctoring/exam/{exam_id}/students` | Get students who attempted exam |

### Answer Service (New)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/answer/exam/{examID}/submissions` | Get all submissions for exam |
| GET | `/api/answer/submission/{submissionID}` | Get submission details |
| POST | `/api/answer/submission/{submissionID}/evaluate` | Trigger LLM evaluation |
| GET | `/api/answer/submission/{submissionID}/result` | Get evaluation result |

### LLM Service (New - gRPC)

| RPC Method | Description |
|------------|-------------|
| `EvaluateTheoryAnswer` | Evaluate single theory answer |
| `EvaluateBatch` | Evaluate multiple answers in batch |

---

## Notes

1. **gRPC vs REST**: gRPC is chosen for Answer ↔ LLM communication due to:
   - Better performance for potentially large payloads
   - Strongly typed contracts via proto
   - Built-in streaming support for future batch processing

2. **MCQ Evaluation**: MCQs are evaluated locally in Answer Service by comparing `selected_option` with `correct_option` - no LLM call needed.

3. **Error Handling**: If LLM evaluation fails, mark status as `failed` and allow retry.

4. **Rate Limiting**: Consider queuing evaluation requests if many students submit simultaneously.
