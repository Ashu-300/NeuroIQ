# NeuroIQ Services — Complete Backend API Documentation

## Overview
This document provides a comprehensive service-by-service backend layout, complete route definitions with **request and response bodies**, WebSocket contract for real-time proctoring, DTOs, models, and source file links. It is intended as the canonical developer-facing service documentation.

---

## Table of Contents
1. [High-level Architecture](#high-level-architecture)
2. [Common Conventions](#common-conventions)
3. [Authentication Service (auth)](#1-authentication-service-auth)
4. [Ingestion Service (ingestion)](#2-ingestion-service-ingestion)
5. [LLM Service (llm)](#3-llm-service-llm)
6. [Management Service (management)](#4-management-service-management)
7. [Question Service (question)](#5-question-service-question)
8. [Proctoring Service (proctoring)](#6-proctoring-service-proctoring)
9. [WebSocket Implementation Notes](#websocket-implementation-notes)
10. [Inter-service Contracts](#inter-service-contracts)
11. [Deployment & Operations](#deployment--operations)

---

## High-level Architecture
NeuroIQ is a microservices platform comprised of specialized services: `auth`, `ingestion`, `llm`, `proctoring`, `question`, and `management`. Services communicate via HTTP and JWT-based auth. The `proctoring` service exposes a WebSocket for live AI proctoring.

```
[Clients] <--HTTP/WebSocket--> [Proctoring (FastAPI + WS)]
       \                         /
        \--HTTP (JWT)----------/          [Auth (Go)]
                 |                          |
                 |--HTTP/Tasks--> [LLM (Node)]   |
                 |                          |
             [Ingestion (Go)]              [Management (Go)]
                       \                      /
                        \---> [Question (Go)]
```

---

## Common Conventions

### Authentication
- **JWT Bearer tokens** issued by `auth` service
- All protected endpoints require `Authorization: Bearer <token>` header
- Token contains: `id`, `email`, `role` claims

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 202 | Accepted - Request accepted for processing |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |
| 502 | Bad Gateway - Upstream service error |

### Datastores
- **PostgreSQL**: Relational data (users, students, rooms, attendance)
- **MongoDB**: Document-based (materials, exam sessions, violations, questions)

---

## 1. Authentication Service (auth)

**Port:** 8001  
**Purpose:** User lifecycle management, JWT token issuance, student registration

### Source Files
- Routes: [auth/src/routes/routes.go](auth/src/routes/routes.go)
- Controller: [auth/src/controller/controller.go](auth/src/controller/controller.go)
- DTOs: [auth/src/dto/dto.go](auth/src/dto/dto.go)
- Models: [auth/src/models/models.go](auth/src/models/models.go), [auth/src/models/studentmodel.go](auth/src/models/studentmodel.go)

### Models

#### User
```json
{
  "id": "uuid-string",
  "name": "string",
  "email": "string",
  "password_hash": "string",
  "role": "student | teacher | admin",
  "institution": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Student
```json
{
  "id": "uuid-string",
  "first_name": "string",
  "last_name": "string",
  "roll_number": "string",
  "branch": "CSE | IT | ECE | MECH | CIVIL | EE | EC",
  "semester": 1-8,
  "section": "string (optional)",
  "email": "string",
  "phone": "string",
  "user_id": "uuid-string (FK to user)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

---

### API Endpoints

#### POST `/api/auth/signup`
Register a new user.

**Request Body:**
```json
{
  "name": "string (required, min 3 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)",
  "role": "student | teacher | admin (required)",
  "institution": "string (required)"
}
```

**Response (201 Created):**
```json
{
  "message": "User data saved successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `409 Conflict`: Email already registered
```json
{
  "error": "Email already registered"
}
```

---

#### POST `/api/auth/login`
Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "message": "User logged in successfully",
  "accessToken": "jwt-access-token-string",
  "refreshToken": "jwt-refresh-token-string",
  "User": {
    "name": "string",
    "role": "student | teacher | admin"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Invalid email or password

---

#### POST `/api/auth/token/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "message": "User token refreshed successfully",
  "accessToken": "new-jwt-access-token-string",
  "refreshToken": "new-jwt-refresh-token-string"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Invalid or expired refresh token

---

#### POST `/api/auth/register/student`
Register a new student profile.

**Request Body:**
```json
{
  "first_name": "string (required)",
  "last_name": "string (required)",
  "roll_number": "string (required, unique)",
  "enrollment_no": "string (required)",
  "branch": "CSE | IT | ECE | MECH | CIVIL | EE | EC (required)",
  "semester": 1-8 (required),
  "section": "string (optional)",
  "email": "string (required, valid email)",
  "phone": "string (optional)",
  "user_id": "uuid-string (required, must exist)"
}
```

**Response (201 Created):**
```json
{
  "message": "Student registered successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or User ID does not exist
- `409 Conflict`: Roll number already registered
```json
{
  "error": "Roll number already registered"
}
```

---

#### GET `/api/auth/get/studentlist`
Query students by prefix, branch, and semester.

**Request Body:**
```json
{
  "prefix": "string (required, e.g., '0101CS')",
  "branch": "string (required)",
  "semester": 1-8 (required)
}
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid-string",
    "first_name": "string",
    "last_name": "string",
    "roll_number": "string",
    "branch": "string",
    "semester": 1,
    "section": "string",
    "email": "string",
    "phone": "string",
    "user_id": "uuid-string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `500 Internal Server Error`: Failed to fetch students

---

#### GET `/api/auth/get/user` 🔒 Protected
Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "uuid-string",
  "name": "string",
  "email": "string",
  "role": "student | teacher | admin",
  "institution": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: User not found

---

#### PUT `/api/auth/update` 🔒 Protected
Update current user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (all fields optional):**
```json
{
  "name": "string (optional, min 3 chars)",
  "role": "student | teacher | admin (optional)",
  "institution": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "message": "User updated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: User not found

---

#### GET `/api/auth/get/student` 🔒 Protected
Get student profile for authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "uuid-string",
  "first_name": "string",
  "last_name": "string",
  "roll_number": "string",
  "branch": "string",
  "semester": 1,
  "section": "string",
  "email": "string",
  "phone": "string",
  "user_id": "uuid-string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `403 Forbidden`: Access denied
- `404 Not Found`: Student not found

---

## 2. Ingestion Service (ingestion)

**Port:** 8002  
**Purpose:** Upload and process course materials (PDFs), extract text, generate questions via LLM

### Source Files
- Routes: [ingestion/src/routes/routes.go](ingestion/src/routes/routes.go)
- Controller: [ingestion/src/controller/controller.go](ingestion/src/controller/controller.go)
- DTOs: [ingestion/src/dto/dto.go](ingestion/src/dto/dto.go)
- Models: [ingestion/src/model/model.go](ingestion/src/model/model.go)

### Models

#### Content
```json
{
  "id": "ObjectId",
  "subject": "string",
  "content": [
    {
      "unit": "string",
      "content": "string"
    }
  ],
  "user_id": "string",
  "role": "string",
  "pdfurl": "string (Cloudinary URL)",
  "created_at": "timestamp"
}
```

---

### API Endpoints

#### POST `/api/ingestion/upload` 🔒 Protected
Upload course material (PDF), extract text, and generate questions.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF file (max 20MB) |
| `subject` | string | Yes | Subject name |
| `role` | string | Yes | User role |
| `num_3marks` | int | No | Number of 3-mark questions to generate |
| `num_4marks` | int | No | Number of 4-mark questions to generate |
| `num_10marks` | int | No | Number of 10-mark questions to generate |

**Response (202 Accepted):**
```json
{
  "message": "Material uploaded successfully",
  "content_id": "ObjectId",
  "questions": [
    {
      "success": true,
      "questions": [
        {
          "marks": 3,
          "question": "Question text here"
        },
        {
          "marks": 4,
          "question": "Question text here"
        },
        {
          "marks": 10,
          "question": "Question text here"
        }
      ]
    }
  ],
  "cloudinaryUrl": "https://cloudinary.com/path/to/pdf"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid file
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Failed to process or upload

---

#### GET `/api/ingestion/get/{id}` 🔒 Protected
Fetch material by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the material |

**Response (302 Found):**
```json
{
  "success": true,
  "data": {
    "id": "ObjectId",
    "subject": "string",
    "content": [
      {
        "unit": "Unit 1",
        "content": "Extracted text content..."
      }
    ],
    "user_id": "string",
    "role": "string",
    "pdfurl": "https://cloudinary.com/path/to/pdf",
    "created_at": "timestamp"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid ID format
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: Material not found

---

#### GET `/api/ingestion/get` 🔒 Protected
Get all materials for authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (302 Found):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "ObjectId",
      "subject": "string",
      "content": [...],
      "user_id": "string",
      "role": "string",
      "pdfurl": "string",
      "created_at": "timestamp"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: No materials found
- `500 Internal Server Error`: Database error

---

## 3. LLM Service (llm)

**Port:** 8003  
**Purpose:** Generate questions (theory & MCQ) and seating arrangements using Ollama/LLaMA

### Source Files
- App: [llm/src/app.js](llm/src/app.js)
- Routes: [llm/src/routes/routes.js](llm/src/routes/routes.js)
- Controller: [llm/src/controller/controller.js](llm/src/controller/controller.js)
- Service: [llm/src/service/service.js](llm/src/service/service.js)

---

### API Endpoints

#### POST `/api/llm/generate/theory/questions` 🔒 Protected
Generate theory questions from syllabus content.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "string (required)",
  "unit_syllabus": "string (required, syllabus content)",
  "num_3marks": 2 (optional, default: 2),
  "num_4marks": 2 (optional, default: 2),
  "num_10marks": 1 (optional, default: 1)
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "questions": [
    {
      "marks": 3,
      "question": "Define the concept of..."
    },
    {
      "marks": 4,
      "question": "Explain the process of..."
    },
    {
      "marks": 10,
      "question": "Discuss in detail..."
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Missing subject or unit_syllabus
```json
{
  "success": false,
  "message": "subject and unit_syllabus are required"
}
```
- `500 Internal Server Error`: LLM processing failed
```json
{
  "success": false,
  "message": "Failed to generate response"
}
```

---

#### POST `/api/llm/generate/mcq/questions` 🔒 Protected
Generate multiple choice questions from syllabus content.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "string (required)",
  "semester": "string (optional)",
  "unit_syllabus": "string (required)",
  "num_mcqs": 5 (optional, default: 5)
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "questions": [
    {
      "question": "Which of the following is correct?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option": "Option A"
    },
    {
      "question": "What is the purpose of...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option": "Option C"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: LLM processing failed

---

#### POST `/api/llm/generate-seating-arrangement` 🔒 Protected
Generate optimized seating arrangement for exams.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "students": [
    {
      "id": "uuid-string",
      "first_name": "John",
      "last_name": "Doe",
      "roll_number": "0101CS221038",
      "branch": "CSE",
      "semester": 5,
      "section": "A",
      "email": "john@example.com",
      "phone": "1234567890",
      "user_id": "uuid-string"
    }
  ],
  "rooms": [
    {
      "room_id": "R101",
      "rows": 5,
      "columns": 6,
      "branch": "ECE"
    }
  ]
}
```

**Response (200 OK):**
```json
[
  {
    "room_id": "R101",
    "rows": 5,
    "columns": 6,
    "student_arragement": [
      ["0101CS221038", "0101EC221045", "0101CS221040", "", "", ""],
      ["0101EC221050", "0101CS221041", "0101EC221055", "", "", ""],
      ["", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["", "", "", "", "", ""]
    ]
  },
  {
    "room_id": "R102",
    "rows": 4,
    "columns": 4,
    "student_arragement": [
      ["0101ME221001", "0101CV221010", "", ""],
      ["0101ME221005", "0101CV221015", "", ""],
      ["", "", "", ""],
      ["", "", "", ""]
    ]
  }
]
```

**Seating Rules Applied:**
1. Students NOT placed in their own department's room
2. Maximum 2 different branches per room
3. Branch alternation between rows (zig-zag pattern)
4. Capacity limits respected

**Error Responses:**
- `400 Bad Request`: students/rooms must be non-empty arrays
```json
{
  "message": "students and rooms must be arrays"
}
```
- `500 Internal Server Error`: LLM JSON parsing failed
```json
{
  "message": "LLM did not return valid JSON seating arrangement",
  "raw": "LLM raw output..."
}
```

---

## 4. Management Service (management)

**Port:** 8004  
**Purpose:** Room management, attendance tracking, seating arrangement orchestration

### Source Files
- Routes: [management/src/routes/routes.go](management/src/routes/routes.go)
- Controller: [management/src/controller/controller.go](management/src/controller/controller.go)
- DTOs: [management/src/dto/dto.go](management/src/dto/dto.go)
- Models: [management/src/models/model.go](management/src/models/model.go)

### Models

#### Room
```json
{
  "room_id": "string",
  "rows": "integer",
  "columns": "integer",
  "branch": "string"
}
```

#### Attendance
```json
{
  "id": "integer",
  "exam_id": "string",
  "student_id": "string",
  "room_id": "string",
  "seat_no": "integer",
  "status": "string",
  "answer_sheet_id": "string"
}
```

#### SeatingArrangement
```json
{
  "_id": "ObjectId",
  "room_id": "string",
  "rows": "integer",
  "columns": "integer",
  "student_arragement": [["roll_number", ...], ...]
}
```

---

### API Endpoints

#### POST `/api/management/register/room`
Register a single room.

**Request Body:**
```json
{
  "room_id": "string (required, unique)",
  "rows": "integer (required)",
  "columns": "integer (required)",
  "branch": "string (required)"
}
```

**Response (201 Created):**
```json
{
  "message": "Room registered successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body or validation error
- `500 Internal Server Error`: Failed to register room

---

#### POST `/api/management/register/multiple-room`
Bulk register multiple rooms.

**Request Body:**
```json
[
  {
    "room_id": "R101",
    "rows": 5,
    "columns": 6,
    "branch": "CSE"
  },
  {
    "room_id": "R102",
    "rows": 4,
    "columns": 5,
    "branch": "ECE"
  }
]
```

**Response (201 Created):**
```json
{
  "message": "Rooms registered successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Failed to register rooms or transaction error

---

#### GET `/api/management/get/rooms`
Get all registered rooms.

**Response (200 OK):**
```json
[
  {
    "room_id": "R101",
    "rows": 5,
    "columns": 6,
    "branch": "CSE"
  },
  {
    "room_id": "R102",
    "rows": 4,
    "columns": 5,
    "branch": "ECE"
  }
]
```

**Error Responses:**
- `500 Internal Server Error`: Failed to fetch rooms

---

#### POST `/api/management/mark/attendance`
Mark student attendance for an exam.

**Request Body:**
```json
{
  "exam_id": "string (required)",
  "student_id": "string (required)",
  "room_id": "string (required)",
  "seat_no": "integer (required)",
  "status": "present | absent (required)",
  "answer_sheet_id": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "message": "Attendance marked successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Failed to mark attendance

---

#### POST `/api/management/generate-seating-arrangement` 🔒 Protected
Generate seating arrangement by querying students from auth service and rooms from DB.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "prefix": "string (required, e.g., '0101CS')",
  "branch": "string (required)",
  "semester": 1-8 (required)
}
```

**Response (200 OK):**
```json
[
  {
    "room_id": "R101",
    "rows": 5,
    "columns": 6,
    "student_arragement": [
      ["0101CS221038", "0101EC221045", "0101CS221040", "", "", ""],
      ["0101EC221050", "0101CS221041", "", "", "", ""],
      ...
    ]
  }
]
```

**Process Flow:**
1. Calls Auth service `/get/studentlist` to fetch students
2. Fetches rooms from PostgreSQL
3. Sends to LLM service `/generate-seating-arrangement`
4. Stores result in MongoDB
5. Returns seating arrangement

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Service/database error
- `502 Bad Gateway`: Auth or LLM service unavailable

---

#### POST `/api/management/schedule/exam` 🔒 Protected
Schedule a new exam.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "exam_id": "ObjectId (required, references exam from question bank)",
  "title": "string (required)",
  "subject": "string (required)",
  "semester": "string (required)",
  "date": "2026-02-15T00:00:00Z (required, ISO 8601)",
  "start_time": "10:00 (required)",
  "end_time": "13:00 (required)",
  "duration_min": 180 (required),
  "total_marks": 100 (required)
}
```

**Response (201 Created):**
```json
{
  "exam_id": "507f1f77bcf86cd799439011",
  "title": "End Semester Exam",
  "subject": "Data Structures",
  "semester": "4",
  "date": "2026-02-15T00:00:00Z",
  "start_time": "10:00",
  "end_time": "13:00",
  "duration_min": 180,
  "total_marks": 100,
  "created_by": "",
  "created_at": "2026-02-12T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body or validation error
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Failed to schedule exam

---

#### GET `/api/management/get/scheduled-exams/branch/{branch}/semester/{semester}`
Get scheduled exams for a specific branch and semester.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| branch | string | Yes | Branch code (e.g., `CSE`, `IT`) |
| semester | string | Yes | Semester number as string (e.g., `4`) |

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "exam_id": "507f1f77bcf86cd799439010",
    "title": "End Semester Exam",
    "subject": "Data Structures",
    "semester": "4",
    "date": "2026-02-15T00:00:00Z",
    "start_time": "10:00",
    "end_time": "13:00",
    "duration_min": 180,
    "total_marks": 100,
    "created_by": "",
    "created_at": "2026-02-12T10:30:00Z"
  }
]
```

**Error Responses:**
- `500 Internal Server Error`: Failed to fetch exams or cursor error

---

#### GET `/api/management/get/exam-details/{scheduleID}` 🔒 Protected
Get details of a specific scheduled exam.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scheduleID | string | Yes | MongoDB ObjectId of the scheduled exam |

**Response (200 OK):**
```json
{
  "title": "End Semester Exam",
  "subject": "Data Structures",
  "semester": "4",
  "date": "2026-02-15T00:00:00Z",
  "start_time": "10:00",
  "end_time": "13:00",
  "duration_min": 180,
  "total_marks": 100,
  "created_by": "",
  "created_at": "2026-02-12T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid schedule ID
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: Exam not found

---

#### DELETE `/api/management/delete/scheduled-exam/{scheduleID}` 🔒 Protected
Delete a scheduled exam.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scheduleID | string | Yes | MongoDB ObjectId of the scheduled exam |

**Response (200 OK):**
```json
{
  "message": "Schedule deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid schedule ID
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: Schedule not found
- `500 Internal Server Error`: Failed to delete schedule

---

#### PUT `/api/management/update/exam-time/{scheduleID}` 🔒 Protected
Update the start and end time of a scheduled exam.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scheduleID | string | Yes | MongoDB ObjectId of the scheduled exam |

**Request Body:**
```json
{
  "start_time": "11:00 (required)",
  "end_time": "14:00 (required)"
}
```

**Response (200 OK):**
```json
{
  "message": "Schedule time updated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid schedule ID, invalid request body, or validation error
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: Schedule not found
- `500 Internal Server Error`: Failed to update schedule time

---

## 5. Question Service (question)

**Port:** 8005  
**Purpose:** Store and manage question sets, generate exams

### Source Files
- Routes: [question/src/routes/routes.go](question/src/routes/routes.go)
- Controller: [question/src/controller/controller.go](question/src/controller/controller.go)
- DTOs: [question/src/dto/dto.go](question/src/dto/dto.go)
- Models: [question/src/models/models.go](question/src/models/models.go)

### Models

#### TheoryQuestion
```json
{
  "marks": "integer (required)",
  "question": "string (required)"
}
```

#### MCQQuestion
```json
{
  "question": "string (required)",
  "options": ["string", "string", "string", "string"] (required, 4 options),
  "correct_option": "string (required, must match one option)"
}
```

#### TheoryQuestions (Collection)
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "subject": "string",
  "semester": "string",
  "theory_questions": [TheoryQuestion]
}
```

#### MCQQuestions (Collection)
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "subject": "string",
  "semester": "string",
  "mcq_questions": [MCQQuestion]
}
```

---

### API Endpoints

#### POST `/api/question/register/theory` 🔒 Protected
Register a set of theory questions.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "string (required)",
  "semester": "string (required)",
  "theory_questions": [
    {
      "marks": 3,
      "question": "Define polymorphism in OOP."
    },
    {
      "marks": 4,
      "question": "Explain the concept of inheritance."
    },
    {
      "marks": 10,
      "question": "Discuss SOLID principles in detail."
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "message": "questions saved to question bank",
  "mongo_response": {
    "InsertedID": "ObjectId"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or decoding error
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database insert failed

---

#### POST `/api/question/register/mcq` 🔒 Protected
Register a set of MCQ questions.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "string (required)",
  "semester": "string (required)",
  "mcq_questions": [
    {
      "question": "What is the time complexity of binary search?",
      "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      "correct_option": "O(log n)"
    },
    {
      "question": "Which data structure uses LIFO?",
      "options": ["Queue", "Stack", "Array", "Tree"],
      "correct_option": "Stack"
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "message": "questions saved to question bank",
  "mongo_response": {
    "InsertedID": "ObjectId"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database insert failed

---

#### POST `/api/question/exam/generate/theory` 🔒 Protected
Generate a theory exam from question sets.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "string (required)",
  "semester": "string (required)",
  "category": "THEORY (required)",
  "mcq_questions": [
    {
      "marks": 3,
      "question": "Define abstraction."
    },
    {
      "marks": 10,
      "question": "Explain design patterns."
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "message": "Theory exam saved successfully",
  "mongo_response": {
    "InsertedID": "ObjectId"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database insert failed

---

#### POST `/api/question/exam/generate/mcq` 🔒 Protected
Generate an MCQ exam from question sets.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "string (required)",
  "semester": "string (required)",
  "category": "MCQ (required)",
  "mcq_questions": [
    {
      "question": "What is HTTP?",
      "options": ["Protocol", "Language", "Database", "OS"],
      "correct_option": "Protocol"
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "message": "MCQ exam saved successfully",
  "mongo_response": {
    "InsertedID": "ObjectId"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database insert failed

---

#### GET `/api/question/get/question` 🔒 Protected
Fetch questions by subject, semester, and category.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
Params: subject=network security&semester=7&category=THEORY
```


**Response (200 OK):**
```json
{
    "message": "All questions fetched",
    "questions": [
        {
            "_id": "000000000000000000000000",
            "user_id": "000000000000000000000000",
            "subject": "network security",
            "semester": "7",
            "category": "THEORY",
            "theory_questions": [
                {
                    "marks": 3,
                    "question": "What is the primary goal of IPsec?"
                },
                {
                    "marks": 4,
                    "question": "question"
                },
                {
                    "marks": 10,
                    "question": "question"
                },
                {
                    "marks": 10,
                    "question": "question"
                }
            ]
        }
    ]
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database error

---

#### POST `/api/question/exam/generate/both` 🔒 Protected
Generate an exam containing both Theory and MCQ questions.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "string (required)",
  "semester": "string (required)",
  "theory_questions": [
    {
      "marks": 3,
      "question": "Define abstraction in OOP."
    },
    {
      "marks": 10,
      "question": "Explain the SOLID principles in detail."
    }
  ],
  "mcq_questions": [
    {
      "question": "What is the time complexity of binary search?",
      "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      "correct_option": "O(log n)"
    },
    {
      "question": "Which data structure uses LIFO?",
      "options": ["Queue", "Stack", "Array", "Tree"],
      "correct_option": "Stack"
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "message": "Both exam saved successfully",
  "mongo_response": {
    "InsertedID": "ObjectId"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or decoding error
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database insert failed

---

#### GET `/api/question/exam/both/subject/{subject}/semester/{semester}` 🔒 Protected
Fetch exams containing both theory and MCQ questions by subject and semester.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| subject | string | Yes | Subject name (e.g., "network security") |
| semester | string | Yes | Semester number (e.g., "7") |

**Response (200 OK):**
```json
{
  "message": "Exams fetched successfully",
  "exams": [
    {
      "subject": "network security",
      "semester": "7",
      "category": "BOTH",
      "theory_questions": [
        {
          "marks": 3,
          "question": "What is the primary goal of IPsec?"
        },
        {
          "marks": 10,
          "question": "Explain the concept of cryptography."
        }
      ],
      "mcq_questions": [
        {
          "question": "What is HTTP?",
          "options": ["Protocol", "Language", "Database", "OS"],
          "correct_option": "Protocol"
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database error or cursor error

---

#### GET `/api/question/exam/theory/subject/{subject}/semester/{semester}` 🔒 Protected
Fetch theory-only exams by subject and semester.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| subject | string | Yes | Subject name (e.g., "data structures") |
| semester | string | Yes | Semester number (e.g., "4") |

**Response (200 OK):**
```json
{
  "message": "Exams fetched successfully",
  "exams": [
    {
      "subject": "data structures",
      "semester": "4",
      "category": "THEORY",
      "mcq_questions": [
        {
          "marks": 3,
          "question": "Define a binary search tree."
        },
        {
          "marks": 10,
          "question": "Explain the time complexity of various sorting algorithms."
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database error or cursor error

---

#### GET `/api/question/exam/mcq/subject/{subject}/semester/{semester}` 🔒 Protected
Fetch MCQ-only exams by subject and semester.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| subject | string | Yes | Subject name (e.g., "operating systems") |
| semester | string | Yes | Semester number (e.g., "5") |

**Response (200 OK):**
```json
{
  "message": "Exams fetched successfully",
  "exams": [
    {
      "subject": "operating systems",
      "semester": "5",
      "category": "MCQ",
      "mcq_questions": [
        {
          "question": "What is a deadlock?",
          "options": ["Resource conflict", "Memory leak", "Buffer overflow", "Stack overflow"],
          "correct_option": "Resource conflict"
        },
        {
          "question": "Which scheduling algorithm is non-preemptive?",
          "options": ["Round Robin", "FCFS", "SJF Preemptive", "Priority Preemptive"],
          "correct_option": "FCFS"
        }
      ]
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Database error or cursor error

---

## 6. Proctoring Service (proctoring)

**Port:** 8000  
**Purpose:** AI-powered exam proctoring with webcam monitoring, identity verification, violation detection

### Source Files
- Routes: [proctoring/app/routes/exam_routes.py](proctoring/app/routes/exam_routes.py), [proctoring/app/routes/proctor_routes.py](proctoring/app/routes/proctor_routes.py), [proctoring/app/routes/submission_routes.py](proctoring/app/routes/submission_routes.py)
- Controller: [proctoring/app/controller/exam_controller.py](proctoring/app/controller/exam_controller.py)
- DTOs: [proctoring/app/dto/exam_dto.py](proctoring/app/dto/exam_dto.py)
- Models: [proctoring/app/models/exam.py](proctoring/app/models/exam.py)
- WebSocket: [proctoring/app/websocket/proctoring_ws.py](proctoring/app/websocket/proctoring_ws.py)

### Models

#### ExamSession
```json
{
  "_id": "session_id (string)",
  "student_id": "string",
  "exam_id": "string",
  "status": "active | submitted | auto_submitted",
  "start_time": "datetime",
  "end_time": "datetime | null",
  "warnings": "integer (default: 0)",
  "violation_count": "integer (default: 0)",
  "identity_verified": "boolean (default: false)",
  "identity_snapshot_base64": "string | null"
}
```

#### Violation
```json
{
  "_id": "violation_id",
  "session_id": "string",
  "student_id": "string",
  "violation_type": "NO_FACE | MULTIPLE_FACES | LOOKING_AWAY | HEAD_TURN",
  "severity": "low | medium | high | critical",
  "timestamp": "datetime",
  "duration_seconds": "float | null",
  "metadata": "object | null"
}
```

### Violation Types
| Type | Description | Severity |
|------|-------------|----------|
| `NO_FACE` | No face detected in frame | high |
| `MULTIPLE_FACES` | More than one face detected | critical |
| `LOOKING_AWAY` | Student looking away from screen | medium |
| `HEAD_TURN` | Excessive head movement | low |

---

### HTTP API Endpoints

#### POST `/api/proctoring/exam/start` 🔒 Protected
Start a new exam proctoring session.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "exam_id": "string (required, min 1 char)"
}
```

**Response (200 OK):**
```json
{
  "session_id": "uuid-string",
  "exam_id": "string",
  "start_time": "2026-02-02T10:00:00Z",
  "status": "active"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `500 Internal Server Error`: Failed to create session
```json
{
  "detail": "Failed to start exam: <error message>"
}
```

---

#### GET `/api/proctoring/exam/status` 🔒 Protected
Get current exam session status.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | Session ID |

**Response (200 OK):**
```json
{
  "session_id": "uuid-string",
  "status": "active | submitted | auto_submitted",
  "start_time": "2026-02-02T10:00:00Z",
  "elapsed_seconds": 1800,
  "warnings": 2
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `403 Forbidden`: Not authorized to access this session
- `404 Not Found`: Session not found
```json
{
  "detail": "Session <session_id> not found"
}
```

---

#### POST `/api/proctoring/proctor/verify-identity` 🔒 Protected
Verify student identity at exam start.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | Yes | Session ID |

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `frame` | File | Yes | Webcam image file |

**Response (200 OK):**
```json
{
  "verified": true,
  "message": "Identity verified successfully",
  "session_id": "uuid-string"
}
```

**Response (Failed Verification):**
```json
{
  "verified": false,
  "message": "Face not detected or multiple faces found",
  "session_id": "uuid-string"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: Session not found

---

#### POST `/api/proctoring/submission/submit` 🔒 Protected
Submit completed exam (manual submission).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "session_id": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "session_id": "uuid-string",
  "status": "submitted",
  "submitted_at": "2026-02-02T11:30:00Z",
  "total_warnings": 3,
  "violations_count": 5
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `403 Forbidden`: Not authorized to submit this exam
- `404 Not Found`: Session not found
```json
{
  "detail": "Session <session_id> not found"
}
```

---

#### GET `/api/proctoring/submission/report/{session_id}` 🔒 Protected
Get detailed exam report with violations.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | string | Session ID |

**Response (200 OK):**
```json
{
  "session_id": "uuid-string",
  "student_id": "string",
  "exam_id": "string",
  "start_time": "2026-02-02T10:00:00Z",
  "end_time": "2026-02-02T11:30:00Z",
  "duration_seconds": 5400,
  "status": "submitted",
  "total_warnings": 3,
  "violations": [
    {
      "violation_id": "uuid-string",
      "session_id": "uuid-string",
      "violation_type": "NO_FACE",
      "severity": "high",
      "timestamp": "2026-02-02T10:15:00Z",
      "description": "No face detected for 5 seconds"
    },
    {
      "violation_id": "uuid-string",
      "session_id": "uuid-string",
      "violation_type": "LOOKING_AWAY",
      "severity": "medium",
      "timestamp": "2026-02-02T10:30:00Z",
      "description": null
    }
  ],
  "identity_verified": true
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid/missing token
- `403 Forbidden`: Not authorized to access this report
- `404 Not Found`: Session not found

---

### WebSocket API

#### Endpoint: `wss://<host>/ws/proctor/{session_id}`

**Purpose:** Real-time webcam frame processing for proctoring

**Connection Requirements:**
- JWT token must be validated before connection
- Session must exist and be active

**Client → Server Message:**
```json
{
  "frame": "base64-encoded-image-data",
  "timestamp": 1706868000.123
}
```

**Server → Client Response (Normal):**
```json
{
  "status": "ok",
  "processed": true,
  "auto_submit": false,
  "timestamp": 1706868000.123,
  "violation_message": null
}
```

**Server → Client Response (Violation Detected):**
```json
{
  "status": "ok",
  "processed": true,
  "auto_submit": false,
  "timestamp": 1706868000.123,
  "violation_message": "NO_FACE detected"
}
```

**Server → Client Response (Auto-Submit Triggered):**
```json
{
  "status": "auto_submit",
  "message": "Exam auto-submitted due to violations",
  "reason": "Max warnings exceeded"
}
```

**Server → Client Response (Error):**
```json
{
  "status": "error",
  "message": "Missing frame data"
}
```

**WebSocket Close Codes:**
| Code | Reason |
|------|--------|
| 1000 | Normal closure / Exam auto-submitted |
| 4000 | Invalid JSON payload |
| 4004 | Session not found |

---

## WebSocket Implementation Notes

- **Frame Rate:** Recommend 1-3 frames per second
- **Frame Format:** Base64 encoded JPEG/PNG
- **Processing:** Frames processed in-memory using AI models
- **Storage:** Only violation events and minimal snapshots stored in MongoDB
- **Auto-Submit:** Triggered when warning threshold exceeded

---

## Inter-service Contracts

### JWT Token Structure
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "student | teacher | admin",
  "exp": 1706954400,
  "iat": 1706868000
}
```

### Service Communication
| Source | Target | Purpose |
|--------|--------|---------|
| Ingestion → LLM | Generate questions from uploaded materials |
| Management → Auth | Fetch student list by filters |
| Management → LLM | Generate seating arrangements |
| All Services → Auth | Token validation |

---

## Deployment & Operations

### Service Startup Commands
```bash
# Auth Service
cd auth && go run main.go

# Ingestion Service
cd ingestion && go run main.go

# LLM Service
cd llm && npm install && npm run dev

# Management Service
cd management && go run main.go

# Question Service
cd question && go run main.go

# Proctoring Service
cd proctoring && pip install -r requirements.txt && uvicorn app.main:create_app --reload --factory
```

### Service Ports
| Service | Port | Protocol | WebSocket |
|---------|------|----------|-----------|
| Auth | 8001 | HTTP | - |
| Ingestion | 8002 | HTTP | - |
| LLM | 8003 | HTTP | - |
| Management | 8004 | HTTP | - |
| Question | 8005 | HTTP | - |
| Proctoring | 8000 | HTTP/WebSocket | ✓ |

### Environment Variables
Each service requires a `.env` file with:
- `JWT_SECRET` / `JWT_REFRESH_SECRET`
- `MONGODB_URI`
- `POSTGRES_URI` (for auth, management)
- `CLOUDINARY_*` (for ingestion)
- `OLLAMA_URL` (for llm)
- `AUTH_URI`, `LLM_URI` (for inter-service calls)

---

## Health Checks

All services expose `/health` endpoint:
```bash
curl http://localhost:8000/health
curl http://localhost:8001/health
# etc.
```

---

## Monitoring & Logging

### Structured Logging
- **Format:** JSON for easy parsing and aggregation
- **Tools:** Built-in logging in each service
- **Integration:** Suitable for ELK stack, Splunk, CloudWatch

### Database Monitoring
```bash
# MongoDB connections
mongo --host localhost:27017

# PostgreSQL connections
psql -h localhost -U postgres
```

---

## Source Links (Quick Access)
| Service | Source Directory |
|---------|------------------|
| Auth | [auth/src](auth/src) |
| Ingestion | [ingestion/src](ingestion/src) |
| LLM | [llm/src](llm/src) |
| Management | [management/src](management/src) |
| Question | [question/src](question/src) |
| Proctoring | [proctoring/app](proctoring/app) |

---

