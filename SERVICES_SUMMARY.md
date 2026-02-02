# NeuroIQ Services — Complete Backend Layout & Routes

## Overview
This document replaces the brief summary with a service-by-service backend layout, route definitions (primary endpoints), WebSocket contract for real-time proctoring, and links to source files in the repository. It is intended as the canonical developer-facing service documentation.

---

## High-level Architecture
NeuroIQ is a microservices platform comprised of specialized services: `auth`, `ingestion`, `llm`, `proctoring`, `question`, and `management`. Services communicate via HTTP and JWT-based auth. The `proctoring` service exposes a WebSocket for live AI proctoring.

Diagram (conceptual):

```
[Clients] <--HTTP/WebSocket--> [Exam (FastAPI + WS)]
       \                         /
        \--HTTP (JWT)----------/          [Auth (Go)]
                 |                          |
                 |--HTTP/Tasks--> [LLM (Node)]   |
                 |                          |
             [Ingestion (Go)]              [Management (Go)]
                       \                      /
                        \---> [QuestionBank (Go)]
```

---

## Common conventions
- Authentication: JWT bearer tokens issued by `auth` service; all protected endpoints require `Authorization: Bearer <token>`.
- Inter-service trust: Services validate tokens (or public keys) from Auth; sensitive operations use service-to-service tokens.
-- Async flow: `ingestion` produces background tasks; `llm` and other services process them via direct HTTP/webhooks or an optional task queue.
- Datastores: PostgreSQL for relational data (users, rooms); MongoDB for document-based (materials, exam sessions, violations).

---

## Services & Routes (developer reference)

Each service section lists purpose, important routes, and key source file links.

**1. Authentication Service (`auth`)** — purpose: user lifecycle and token issuance
- Key files: [auth/src/routes/routes.go](auth/src/routes/routes.go), [auth/src/controller/controller.go](auth/src/controller/controller.go)
- Primary routes:
  - POST `/signup` — register user
  - POST `/login` — authenticate and return JWT
  - POST `/register/student` — create student record
  - GET `/get/studentlist` — query students by filters
  - GET `/get/user` — protected, return caller profile
  - PUT `/update` — protected, update profile

**2. Ingestion Service (`ingestion`)** — purpose: upload/process course materials
- Key files: [ingestion/src/controller/controller.go](ingestion/src/controller/controller.go), [ingestion/src/service/unipdfService.go](ingestion/src/service/unipdfService.go)
- Primary routes:
  - POST `/upload` — protected, upload material (multipart)
  - GET `/get/{id}` — protected, fetch material
  - GET `/get` — protected, list user's materials
  

**3. LLM Service (`llm`)** — purpose: generate questions and seating arrangements
- Key files: [llm/src/app.js](llm/src/app.js), [llm/src/routes/routes.js](llm/src/routes/routes.js)
- Primary routes:
  - POST `/generate/theory/questions` — protected, generate theory questions from input text or material id
  - POST `/generate/mcq/questions` — protected, generate MCQ questions from input text or material id
  - POST `/generate-seating-arrangement` — protected, generate seating arrangement for an exam
-- Notes: typically processes background tasks produced by `ingestion` and outputs results to questionbank or emits events (via HTTP callbacks or a task queue).

**4. Question Service (`question`)** — purpose: store/manage question sets
- Key files: [question/src/routes/routes.go](question/src/routes/routes.go), [question/src/repository/repository.go](question/src/repository/repository.go)
- Primary routes:
  - POST `/register/theory` — protected, create/register a theory question set
  - POST `/register/mcq` — protected, create/register an MCQ question set
  - POST `/exam/generate/theory` — protected, generate a theory exam from question sets 
  - POST `/exam/generate/mcq` — protected, generate an MCQ exam
  - GET `/get/question` — protected, fetch a question by id or query

**5. Management Service (`management`)** — purpose: rooms & seating admin
- Key files: [management/src/routes/routes.go](management/src/routes/routes.go)
- Primary routes:
  - POST `/register/room` — register single room
  - POST `/register/multiple-room` — bulk room registration
  - GET `/get/rooms` — list rooms
  - POST `/mark/attendance` — mark attendance
  - POST `/generate-seating-arrangement` — protected, request seating plan

**6. Proctoring Service (`proctoring`)** — purpose: conduct exams with AI proctoring (no question paper management)
- Key files: [proctoring/app/routes/exam_routes.py](proctoring/app/routes/exam_routes.py), [proctoring/app/websocket/proctoring_ws.py](proctoring/app/websocket/proctoring_ws.py), [proctoring/app/controller/exam_controller.py](proctoring/app/controller/exam_controller.py)
- Primary HTTP routes (REST):
  - POST `/api/proctoring/exam/start` — protected, create a new proctoring session; returns `session_id` and WS URL
  - GET `/api/proctoring/exam/status?session_id={id}` — protected, fetch live session status
  - POST `/api/proctoring/proctor/verify-identity` — protected, upload image snapshot to verify identity
  - POST `/api/proctoring/submission/submit` — protected, finalize exam (manual or auto)
  - GET `/api/proctoring/submission/report/{session_id}` — protected, retrieve report with violations and timeline

- WebSocket contract (live proctoring):
  - URL pattern: `wss://<host>/ws/proctor/{session_id}`
  - Authorization: initial HTTP handshake must carry the JWT (either `Sec-WebSocket-Protocol` or `Authorization` header) — server validates token and session ownership.
  - Binary frames: clients send compressed JPEG/PNG frames (or base64 JSON) at configured interval (e.g., every 1–3s).
  - Control messages (JSON text frames):
    - Client -> Server: `{ "type": "keepalive" | "meta", "timestamp": 12345 }`
    - Server -> Client: `{ "type": "violation", "code": "NO_FACE", "severity": "high", "count": 2 }`
  - Auto-submit flow: server tracks violation counts; when threshold exceeded it emits `auto_submit` event and triggers `/submission/submit` on server-side.

- Violation types (examples): `NO_FACE`, `MULTIPLE_FACES`, `LOOKING_AWAY`, `HEAD_TURN`, `PHONE_DETECTED`.

- Storage: ephemeral frames are processed in-memory; violation events and snapshots (minimal) stored in MongoDB collections: `exam_sessions`, `violations`.

---

## WebSocket Implementation Notes (Exam)
- Source: [app/websocket/proctoring_ws.py](app/websocket/proctoring_ws.py)
- Handshake: accept only JWT-authenticated connections and verify `session_id` ownership.
- Throughput & sizing: recommend 1–3s frames per client; scale with horizontal uvicorn workers + sticky sessions / routing.
- Monitoring: emit structured JSON logs for each violation and provide an audit export API.

---

## Inter-service Contracts
- Auth: all services validate JWT and may call `auth` for token introspection if needed. See [auth/src/jwtutil/jwtutil.go](auth/src/jwtutil/jwtutil.go).
-- Background tasks / topics: ingestion -> llm/task-processor -> questionbank (implemented via HTTP/webhook calls or an optional message broker).
- Exam → QuestionBank: exam does not fetch papers from questionbank by default; integration points exist if offline exams or paper-based validation required.

---

## Deployment & Operations
- Env management: `.env` per service; secrets stored in vault for production.
-- Docker Compose for local dev: infrastructure services (MongoDB, Postgres) are in `docker-compose.yml`. Kafka and Zookeeper were removed from the platform.
- Scaling recommendations:
  - `exam` horizontally behind a load balancer with sticky sessions for WebSocket routing.
  - Use direct HTTP/webhooks or a task queue for buffering heavy ingestion/LLM workloads when needed.

---

## Source Links (quick access)
- Auth: [auth/src](auth/src)
- Ingestion: [ingestion/src](ingestion/src)
- LLM: [llm/src](llm/src) and [llm/src/routes/routes.js](llm/src/routes/routes.js)
- Proctoring: [proctoring/app/routes/exam_routes.py](proctoring/app/routes/exam_routes.py) and [proctoring/app/websocket/proctoring_ws.py](proctoring/app/websocket/proctoring_ws.py)
- Question: [question/src](question/src)
- Management: [management/src](management/src)

---


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
| proctoring | 8000 | HTTP/WebSocket | ✓ |

---

## Monitoring & Logging

### Structured Logging
- **Format:** JSON for easy parsing and aggregation
- **Tools:** Built-in logging in each service
- **Integration:** Suitable for ELK stack, Splunk, CloudWatch

### Health Checks
All services expose `/health` endpoint:
```bash
curl http://localhost:8000/health
```

### Database Monitoring
```bash
# MongoDB connections
mongo --host localhost:27017

# PostgreSQL connections
psql -h localhost -U postgres
```

```bash
cd auth && go run main.go
cd ingestion && go run main.go
cd llm && npm run dev
cd management && go run main.go
cd questionbank && go run main.go
```

---

