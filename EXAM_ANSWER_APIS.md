# Exam Answer Submission APIs

This document describes the backend APIs required to support exam answering and submission for the student flow (launch exam → identity verification → proctored attempt → submission → report).

## 1. Start Exam Session

**Endpoint**  
`POST /api/proctoring/exam/start`

**Description**  
Create a proctored exam session for a given exam and student.

**Request Body (JSON)**
```json
{
  "exam_id": "string",           
  "student_id": "string"        
}
```

**Successful Response (200)**
```json
{
  "session_id": "string",        
  "exam_id": "string",
  "student_id": "string",
  "started_at": "2025-01-01T10:00:00Z"
}
```

---

## 2. Get Exam Questions

**Endpoint**  
`GET /api/proctoring/exam/{exam_id}/questions`

**Description**  
Return the list of questions (MCQ + theory) that the student must answer in the exam.

**Path Parameters**
- `exam_id` – ID of the exam whose questions should be loaded.

**Successful Response (200)**
```json
{
  "exam_id": "string",
  "questions": [
    {
      "id": "q1",
      "question": "What is the time complexity of binary search?",
      "type": "MCQ",                 
      "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
      "marks": 2
    },
    {
      "id": "q2",
      "question": "Explain the difference between stack and queue.",
      "type": "THEORY",              
      "marks": 5
    }
  ]
}
```

---

## 3. Verify Identity

**Endpoint**  
`POST /api/proctoring/proctor/verify-identity`

**Description**  
Verify the student's identity using a live face photo and an ID card photo before starting the proctored session. On success this should either create or return an active `session_id`.

**Request (multipart/form-data)**
- `face_image` – image file (JPEG/PNG) of the student's face.  
- `id_card_image` – image file (JPEG/PNG) of the student's ID card.  
- `exam_id` – string, exam identifier.  
- (optional) `student_id` – string, current student.

**Successful Response (200)**
```json
{
  "verified": true,
  "message": "Identity verified successfully",
  "session_id": "string"          
}
```

**Failure Response (400/401)**
```json
{
  "verified": false,
  "message": "Face and ID card do not match"
}
```

---

## 4. Proctoring WebSocket (Live Monitoring)

**Endpoint (WebSocket)**  
`GET /ws/proctor?session_id={session_id}&token={jwt}`

**Description**  
Bi-directional channel for sending webcam frames from the client and receiving violation events from the server during the exam.

### 4.1. Client → Server: Frame Message

The frontend currently sends messages like:

```json
{
  "frame": "<base64-encoded-jpeg-without-data-prefix>",
  "timestamp": 1739443200
}
```

- `frame` – raw base64-encoded JPEG binary (no `data:image/...` prefix).  
- `timestamp` – Unix timestamp (seconds).

### 4.2. Server → Client: Violation Message

When the server detects suspicious behavior, it should send messages of the form:

```json
{
  "type": "violation",
  "message": "Multiple faces detected",
  "timestamp": "2025-01-01T10:05:00Z",
  "code": "MULTIPLE_FACES"         
}
```

The frontend uses `type === "violation"` and `message` to show warnings and track violations in the submission payload.

---

## 5. Submit Exam Answers

**Endpoint**  
`POST /api/proctoring/submission/submit`

**Description**  
Submit all answers for the current proctored session along with any proctoring violations.

**Request Body (JSON)**
```json
{
  "exam_id": "string",                    
  "session_id": "string",                 
  "answers": [
    {
      "question_id": "q1",
      "answer": "O(log n)"                
    },
    {
      "question_id": "q2",
      "answer": "A stack is LIFO, a queue is FIFO..."   
    }
  ],
  "violations": [
    {
      "time": "2025-01-01T10:05:00Z",
      "message": "Multiple faces detected"
    }
  ]
}
```

**Successful Response (200)**
```json
{
  "success": true,
  "message": "Exam submitted successfully",
  "session_id": "string",
  "exam_id": "string",
  "score": 50,                            
  "total_marks": 80
}
```

**Failure Response (400/500)**
```json
{
  "success": false,
  "message": "Submission window closed or session invalid"
}
```

---

## 6. Get Exam Report

**Endpoint**  
`GET /api/proctoring/submission/report/{session_id}`

**Description**  
Retrieve the final evaluated report for a completed exam attempt.

**Path Parameters**
- `session_id` – ID of the proctored exam session.

**Successful Response (200)**
```json
{
  "session_id": "string",
  "exam_id": "string",
  "student_id": "string",
  "score": 50,                 
  "total_marks": 80,
  "submitted_at": "2025-01-01T11:00:00Z",
  "answers": [
    {
      "question_id": "q1",
      "question": "What is the time complexity of binary search?",
      "type": "MCQ",
      "given_answer": "O(log n)",
      "correct_answer": "O(log n)",
      "marks_obtained": 2
    },
    {
      "question_id": "q2",
      "question": "Explain the difference between stack and queue.",
      "type": "THEORY",
      "given_answer": "...",
      "marks_obtained": 4,
      "max_marks": 5
    }
  ],
  "violations": [
    {
      "time": "2025-01-01T10:05:00Z",
      "message": "Multiple faces detected"
    }
  ]
}
```

**Failure Response (404)**
```json
{
  "message": "Report not found for session_id"
}
```

---

These endpoints, together with auth (JWT) and student/teacher management, are enough to support the full flow: start exam, load questions, verify identity, monitor via WebSocket, submit answers, and fetch final reports.
