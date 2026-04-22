# NeuroIQ Functional Requirements

## 1. Purpose and Scope
This document defines the functional requirements for the NeuroIQ backend system based on the implemented services, route contracts, middleware rules, and inter-service integrations.

The system provides:
- User and student identity management
- Content ingestion and AI-assisted question generation
- Question bank and exam definition management
- Exam scheduling, room management, and attendance
- Exam answer submission and evaluation
- Proctoring session control, live violation intake, and reporting

## 2. System Access Model
All client traffic is routed through the API gateway.

- Gateway entry point: port 80
- Frontend root: `/`
- API namespaces:
1. `/api/auth`
2. `/api/ingestion`
3. `/api/llm`
4. `/api/management`
5. `/api/question`
6. `/api/answer`
7. `/api/proctoring`

The gateway also exposes:
- Proctoring websocket path: `/ws/socket.io` (namespace `/proctor`)
- LLM gRPC route for evaluation service

## 3. Actors and Roles
The implementation supports these actor types:
1. Admin
2. Teacher
3. Student
4. Proctoring Agent (machine client over websocket)

Role constraints enforced in middleware:
1. `question` service protected routes: teacher or admin only
2. `management` service protected routes: teacher or admin only
3. `auth`, `ingestion`, `answer`, `proctoring` protected routes: any valid JWT user unless restricted in controller logic

## 4. Authentication and Authorization Requirements
### FR-AUTH-1: JWT Authentication
Protected endpoints must require `Authorization: Bearer <token>`.

### FR-AUTH-2: Token Validation
Services must validate token signature and claims before allowing protected operations.

### FR-AUTH-3: Access and Refresh Token Support
Auth service must issue both access token and refresh token at login, and provide token refresh endpoint.

### FR-AUTH-4: Identity Propagation
On successful auth, middleware must inject user identity context (user id, email, role) for downstream business logic.

## 5. Service-Wise Functional Requirements

## 5.1 Auth Service (`/api/auth`)
### Public Endpoints
### FR-AU-1: User Signup
- Endpoint: `POST /signup`
- Behavior:
1. Accept user registration details
2. Validate payload
3. Reject duplicate email
4. Hash password using bcrypt
5. Persist user record
6. Return created status

### FR-AU-2: User Login
- Endpoint: `POST /login`
- Behavior:
1. Validate credentials
2. Compare password hash
3. Issue access and refresh tokens
4. Return user summary (name, role)

### FR-AU-3: Refresh Token
- Endpoint: `POST /token/refresh`
- Behavior:
1. Validate refresh token
2. Ensure user still exists
3. Issue new access and refresh tokens

### FR-AU-4: Student List Retrieval for Seating Input
- Endpoint: `GET /get/studentlist`
- Behavior:
1. Accept filter by roll-prefix, branch, semester
2. Return matching students for scheduling/seating workflows

### Protected Endpoints
### FR-AU-5: Register Student Profile
- Endpoint: `POST /register/student`
- Behavior:
1. Require authenticated user
2. Validate student payload
3. Reject duplicate roll number
4. Persist student linked to authenticated user

### FR-AU-6: Get Student Profile (Student Self)
- Endpoint: `GET /get/student`
- Behavior:
1. Require authenticated user
2. Allow only role `student`
3. Return student profile by authenticated user id

### FR-AU-7: Update Student Profile (Student Self)
- Endpoint: `PUT /update/student`
- Behavior:
1. Require authenticated user
2. Allow only role `student`
3. Validate and update own student profile

### FR-AU-8: Get Current User
- Endpoint: `GET /get/user`
- Behavior:
1. Return authenticated user account details

### FR-AU-9: Update Current User
- Endpoint: `PUT /update`
- Behavior:
1. Accept partial updates (name, role, institution)
2. Validate payload
3. Persist user updates

## 5.2 Ingestion Service (`/api/ingestion`)
All current endpoints are under auth middleware.

### FR-IN-1: Upload Study Material and Generate Questions
- Endpoint: `POST /upload`
- Behavior:
1. Accept multipart PDF upload and metadata (`subject`, `role`, question-count controls)
2. Extract text from PDF
3. Clean and split syllabus content by units
4. For each unit, call LLM generation endpoint
5. Upload original PDF to Cloudinary
6. Store metadata, chunked content, owner id, and Cloudinary URL in MongoDB
7. Return stored content id, generated questions, and file URL

### FR-IN-2: Get Material by ID
- Endpoint: `GET /get/{id}`
- Behavior:
1. Validate Mongo ObjectID
2. Return matching material document

### FR-IN-3: Get Material by Authenticated User
- Endpoint: `GET /get`
- Behavior:
1. Resolve user id from JWT context
2. Return all material records owned by that user

## 5.3 LLM Service (`/api/llm`)
### Protected Generation Endpoints
### FR-LLM-1: Generate Theory Questions
- Endpoint: `POST /generate/theory/questions`
- Behavior:
1. Require auth
2. Accept subject and unit syllabus
3. Support mark-wise split controls (3m/4m/10m)
4. Return strict JSON array of theory questions with marks

### FR-LLM-2: Generate MCQ Questions
- Endpoint: `POST /generate/mcq/questions`
- Behavior:
1. Require auth
2. Accept subject, syllabus, optional semester, MCQ count
3. Return strict JSON MCQ list with options and correct option

### FR-LLM-3: Generate Seating Arrangement
- Endpoint: `POST /generate-seating-arrangement`
- Behavior:
1. Require auth
2. Accept students array and rooms array
3. Produce room-wise 2D seat maps with roll numbers and empty-seat placeholders
4. Return raw JSON array for downstream unmarshalling by management service

### Evaluation Endpoints (Unprotected by current route config)
### FR-LLM-4: Evaluate Single Theory Answer (REST)
- Endpoint: `POST /evaluate`
- Behavior:
1. Accept question text, answer text, max marks, subject
2. Return obtained marks and feedback
3. Return 0 if answer is blank

### FR-LLM-5: Evaluate Theory Answers in Batch (REST)
- Endpoint: `POST /evaluate/batch`
- Behavior:
1. Accept answers array
2. Evaluate each answer sequentially
3. Return per-question marks, feedback, and success status

### FR-LLM-6: gRPC Evaluation Service
The service must expose gRPC methods:
1. `EvaluateTheoryAnswer`
2. `EvaluateMCQAnswer`

This gRPC server is consumed by the Answer service for evaluation workflows.

## 5.4 Question Service (`/api/question`)
### Public Endpoint
### FR-Q-1: Get Exam by ID
- Endpoint: `GET /exam/{id}`
- Behavior:
1. Validate exam id
2. Return exam document if found

### Protected Endpoints (teacher/admin)
### FR-Q-2: Register Theory Question Set
- Endpoint: `POST /register/theory`
- Behavior:
1. Accept theory question bank payload
2. Validate and assign question ids
3. Store as theory category by subject and semester

### FR-Q-3: Register MCQ Question Set
- Endpoint: `POST /register/mcq`
- Behavior:
1. Accept MCQ question bank payload
2. Validate and assign question ids
3. Store as MCQ category

### FR-Q-4: Register Theory Exam
- Endpoint: `POST /exam/generate/theory`

### FR-Q-5: Register MCQ Exam
- Endpoint: `POST /exam/generate/mcq`

### FR-Q-6: Register Mixed Exam (Theory + MCQ)
- Endpoint: `POST /exam/generate/both`

For FR-Q-4 to FR-Q-6, behavior is:
1. Validate exam payload
2. Persist generated exam document in exam collection

### FR-Q-7: Get Mixed Exams by Subject and Semester
- Endpoint: `GET /exam/both/subject/{subject}/semester/{semester}`

### FR-Q-8: Get Theory Exams by Subject and Semester
- Endpoint: `GET /exam/theory/subject/{subject}/semester/{semester}`

### FR-Q-9: Get MCQ Exams by Subject and Semester
- Endpoint: `GET /exam/mcq/subject/{subject}/semester/{semester}`

### FR-Q-10: Get Question Bank Entries
- Endpoint: `GET /get/question`
- Query params: subject, semester, category
- Behavior:
1. Filter question bank by normalized subject + semester + category
2. Return category-specific question documents

## 5.5 Management Service (`/api/management`)
### Currently Public Routes
### FR-M-1: Register Room
- Endpoint: `POST /register/room`
- Behavior: validate and insert one room in PostgreSQL

### FR-M-2: Register Multiple Rooms
- Endpoint: `POST /register/multiple-room`
- Behavior: validate and insert rooms in transactional batch

### FR-M-3: Get Rooms
- Endpoint: `GET /get/rooms`

### FR-M-4: Mark Attendance
- Endpoint: `POST /mark/attendance`

### FR-M-5: Get Scheduled Exams by Branch and Semester
- Endpoint: `GET /get/scheduled-exams/branch/{branch}/semester/{semester}`

### Protected Routes (teacher/admin)
### FR-M-6: Generate Seating Arrangement
- Endpoint: `POST /generate-seating-arrangement`
- Behavior:
1. Accept student filter input
2. Fetch matching students from Auth service
3. Fetch room list from PostgreSQL
4. Request seating plan from LLM service
5. Store seating arrangement result in MongoDB
6. Return LLM seating response

### FR-M-7: Schedule Exam
- Endpoint: `POST /schedule/exam`
- Behavior:
1. Validate schedule payload
2. Validate exam id format
3. Persist schedule in MongoDB

### FR-M-8: Get Exam Schedule Details
- Endpoint: `GET /get/exam-details/{scheduleID}`

### FR-M-9: Delete Scheduled Exam
- Endpoint: `DELETE /delete/scheduled-exam/{scheduleID}`

### FR-M-10: Update Scheduled Exam Time
- Endpoint: `PUT /update/exam-time/{scheduleID}`
- Behavior: update date, start time, and end time

## 5.6 Answer Service (`/api/answer`)
All routes are behind auth middleware.

### FR-AN-1: Submit Mixed Exam Answers
- Endpoint: `POST /mixed/submit`
- Behavior:
1. Accept combined theory and MCQ answer payload for an exam/session
2. Validate request structure
3. Parse exam and schedule ids
4. Compute MCQ correctness (`selected_option == correct_option`)
5. Store submission with status `SUBMITTED`
6. Return submission id

### FR-AN-2: Get Student Submission by Exam and Schedule
- Endpoint: `GET /exam/{exam_id}/student/{student_id}/{schedule_id}/schedule/submission`

### FR-AN-3: Evaluate One Theory Answer
- Endpoint: `POST /evaluate/theory`
- Behavior:
1. Validate request body
2. Call internal gRPC client to LLM evaluation service
3. Return question id, obtained marks, feedback

### FR-AN-4: Store Full Exam Evaluation
- Endpoint: `POST /exam/evaluation`
- Behavior:
1. Accept theory and MCQ evaluation arrays
2. Calculate total marks as sum of obtained marks
3. Persist evaluation document
4. Return evaluation id

### FR-AN-5: Get Exam Evaluation by Exam and Schedule
- Endpoint: `GET /exam/evaluation/{exam_id}/{schedule_id}/schedule`

### FR-AN-6: Get Student Exam Evaluation
- Endpoint: `GET /exam/{exam_id}/student/{student_id}/evaluation`
- Optional query: `exam_schedule_id`

## 5.7 Proctoring Service (`/api/proctoring` + websocket)
### HTTP Endpoints
### FR-P-1: Get My Exam Session Status
- Endpoint: `GET /exam/{exam_id}/my-status`
- Behavior:
1. Use authenticated user id
2. Optionally filter by `exam_schedule_id`
3. Return whether attempt can start/continue or is already submitted

### FR-P-2: Start Exam Session
- Endpoint: `POST /exam/start`
- Behavior:
1. Accept `exam_id` and `exam_schedule_id`
2. Reject if already submitted
3. Reuse active session if present, else create new active session
4. Return session metadata

### FR-P-3: Get Exam Session Runtime Status
- Endpoint: `GET /exam/status`
- Query: `session_id`
- Behavior:
1. Validate session ownership
2. Return elapsed time and warning count

### FR-P-4: Get Exam Students Overview
- Endpoint: `GET /exam/{exam_id}/students`
- Behavior: return session-wise list and report availability flags

### FR-P-5: Get Exam Students with Reports by Schedule
- Endpoint: `GET /exam/{exam_id}/students/{exam_schedule_id}/reports`

### FR-P-6: Get Session Proctoring Report
- Endpoint: `GET /exam/report/{session_id}`

### FR-P-7: Submit Exam Session
- Endpoint: `POST /submission/submit`
- Behavior:
1. Validate ownership
2. Move status to submitted if not already submitted
3. Finalize and save proctoring report snapshot
4. Return submission metadata

### FR-P-8: Get Submission Report (Student View)
- Endpoint: `GET /submission/report/{session_id}`
- Behavior: return own session report with violation list

### FR-P-9: Query Proctoring Report by Exam/Student/Schedule
- Endpoint: `GET /proctor/report`
- Query: `exam_id`, `student_id`, `exam_schedule_id`

### FR-P-10: Download Desktop Proctor Agent
- Endpoint: `GET /download-agent`
- Behavior: return zip artifact `neuroiq-proctor.zip` when available

### Websocket Functional Requirements
### FR-P-11: Live Proctoring Data Ingestion
- Transport: Socket.IO
- Path: `/ws/socket.io`
- Namespace: `/proctor`
- Event: `proctoring:data`
- Payload requirement: includes `session_id`, `cheating_probability`, and identity/exam context

### FR-P-12: Violation Detection and Persistence
On each proctoring event:
1. Track per-session average and max cheating probability in memory
2. If probability >= 0.7, persist violation record
3. Increment session warning and violation counters
4. Return event acknowledgement

### FR-P-13: Session Finalization on Disconnect
On socket disconnect, the service must finalize tracked session state for that connection.

## 6. Cross-Service Business Workflows
### FR-WF-1: Material-to-Question Pipeline
1. Teacher uploads PDF via ingestion
2. Ingestion extracts and chunks syllabus
3. Ingestion calls LLM generation
4. Questions are returned for downstream exam creation

### FR-WF-2: Seating Arrangement Pipeline
1. Teacher submits branch/semester/prefix filter to management
2. Management fetches students from auth
3. Management fetches rooms from postgres
4. Management calls LLM seating generator
5. Management stores arrangement and returns result

### FR-WF-3: Exam Attempt and Proctoring Pipeline
1. Student starts session in proctoring service
2. Proctoring agent streams probability events via websocket
3. Violations are recorded on threshold breach
4. Student submits exam session
5. Final proctoring report is persisted and queryable

### FR-WF-4: Answer Evaluation Pipeline
1. Student submits mixed answers to answer service
2. For theory scoring, answer service calls LLM gRPC evaluation
3. Evaluation details are stored in answer service
4. Exam/student evaluation results are retrievable

## 7. Input Validation and Error Handling Requirements
### FR-VAL-1: Request Validation
Services must validate required fields and schema constraints before persistence or downstream calls.

### FR-VAL-2: Identifier Validation
Mongo ObjectID-based identifiers must be validated before queries.

### FR-VAL-3: Auth Errors
Missing, malformed, expired, or invalid tokens must return unauthorized responses on protected routes.

### FR-VAL-4: Not Found Handling
Resource lookups with no match must return not found responses.

### FR-VAL-5: External Dependency Failures
When inter-service calls fail (Auth, LLM, storage), services must return explicit failure responses and avoid partial success without signaling error.

## 8. Functional Data Expectations
### FR-DATA-1: Core Persistence
1. PostgreSQL stores users/students, rooms, attendance
2. MongoDB stores ingested content, exams, schedules, submissions, evaluations, proctoring data

### FR-DATA-2: Audit-Relevant Fields
Exam and proctoring records must include timestamps and identifiers required to correlate student, exam, schedule, and session.

### FR-DATA-3: Computed Fields
1. MCQ correctness is computed at submission/evaluation time
2. Evaluation total marks are computed as sum of obtained marks
3. Proctoring summary includes average and max cheating probability

## 9. CORS Functional Requirement
Each HTTP service must support cross-origin access as configured in service-level CORS middleware to allow browser-based frontend calls.

## 10. Notes on Current Implementation Behavior
These are implementation-derived behaviors that affect requirements interpretation:
1. Some management endpoints (room registration, attendance, room listing, scheduled exam listing) are currently public in routing.
2. LLM REST evaluation endpoints are currently exposed without auth middleware.
3. Proctoring report endpoint `/api/proctoring/proctor/report` is currently exposed without auth middleware.

If stricter security is required, these should be converted into explicit access-control requirements and enforced in routes.

