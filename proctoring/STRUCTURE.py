"""
Project structure documentation
"""
PROJECT_STRUCTURE = """
exam/
│
├── app/
│   ├── main.py                         # FastAPI app factory
│   │
│   ├── core/
│   │   ├── config.py                   # Pydantic settings
│   │   ├── security.py                 # JWT validation & AuthContext
│   │   ├── logging.py                  # Structured JSON logging
│   │   └── __init__.py
│   │
│   ├── dto/                            # Data Transfer Objects
│   │   ├── exam_dto.py                 # Request/Response DTOs
│   │   └── __init__.py
│   │
│   ├── models/                         # Database models (Pydantic)
│   │   ├── exam.py                     # DB entities: ExamSession, Violation
│   │   └── __init__.py
│   │
│   ├── controller/                     # Request handlers
│   │   ├── exam_controller.py          # Exam lifecycle controllers
│   │   ├── proctor_controller.py       # Identity verification controller
│   │   ├── submission_controller.py    # Submission & reporting controllers
│   │   └── __init__.py
│   │
│   ├── routes/                         # API route definitions
│   │   ├── exam_routes.py              # Exam endpoints
│   │   ├── proctor_routes.py           # Proctoring endpoints
│   │   ├── submission_routes.py        # Submission endpoints
│   │   └── __init__.py
│   │
│   ├── services/                       # Business logic
│   │   ├── exam_service.py             # Exam session management
│   │   ├── proctoring_service.py       # CV-based violation detection
│   │   ├── violation_service.py        # Violation tracking
│   │   └── __init__.py
│   │
│   ├── proctoring/                     # Computer Vision modules
│   │   ├── face_detection.py           # MediaPipe face detection
│   │   ├── eye_tracking.py             # Gaze direction detection
│   │   ├── head_pose.py                # Head rotation estimation
│   │   ├── rules.py                    # Violation rules engine
│   │   └── __init__.py
│   │
│   ├── websocket/
│   │   ├── proctoring_ws.py            # Live proctoring handler
│   │   └── __init__.py
│   │
│   ├── db/                             # Database layer
│   │   ├── mongo.py                    # MongoDB connection
│   │   ├── repositories.py             # CRUD operations
│   │   └── __init__.py
│   │
│   ├── utils/
│   │   ├── image.py                    # Image processing utilities
│   │   ├── time.py                     # Time utilities
│   │   └── __init__.py
│   │
│   └── __init__.py
│
├── .env                                # Environment variables
├── requirements.txt                    # Python dependencies
├── README.md                           # Service documentation
└── STRUCTURE.py                        # This file

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAYERED ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. REQUEST LAYER (routes/)
   ├─ exam_routes.py      → Defines FastAPI endpoints
   ├─ proctor_routes.py   → Route handlers
   └─ submission_routes.py
   
   Responsibility: Define routes, extract parameters, apply middleware

2. CONTROLLER LAYER (controller/)
   ├─ exam_controller.py
   ├─ proctor_controller.py
   └─ submission_controller.py
   
   Responsibility: 
   - Handle incoming requests
   - Validate inputs using DTOs
   - Call services for business logic
   - Transform service responses to response DTOs
   - Handle authentication/authorization
   - Error handling and logging

3. SERVICE LAYER (services/)
   ├─ exam_service.py       → Exam session operations
   ├─ proctoring_service.py → CV-based violation detection
   └─ violation_service.py  → Violation tracking
   
   Responsibility:
   - Core business logic
   - Orchestrate database operations
   - Call proctoring modules
   - Generate reports

4. PROCTORING LAYER (proctoring/)
   ├─ face_detection.py → MediaPipe integration
   ├─ eye_tracking.py   → Gaze detection
   ├─ head_pose.py      → Head rotation
   └─ rules.py          → Violation policies
   
   Responsibility:
   - Computer vision algorithms
   - Violation rule enforcement
   - No domain knowledge (reusable)

5. DATA LAYER (db/)
   ├─ mongo.py       → Connection management
   └─ repositories.py → CRUD operations
   
   Responsibility:
   - Database connections
   - Query execution
   - Transaction handling

6. DATA MODELS
   ├─ dto/ (Request/Response schemas)
   │  └─ exam_dto.py → Input/output contracts
   │
   └─ models/ (Database entities)
      └─ exam.py → DB records (Pydantic)
   
   Responsibility:
   - DTOs: API contracts (request/response)
   - Models: DB entity definitions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUEST FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /exam/start
    ↓
[Route Handler] exam_routes.start_exam()
    ↓
[Validation] StartExamRequestDTO
    ↓
[Authentication] @Depends(get_current_user)
    ↓
[Controller] ExamController.start_exam()
    ↓
[Service] ExamService.create_exam_session()
    ↓
[Repository] ExamSessionRepository.create_session()
    ↓
[Database] MongoDB → exam_sessions collection
    ↓
[Response] StartExamResponseDTO

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEPARATION OF CONCERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Routes:
  ✓ Define endpoints
  ✓ Extract path/query parameters
  ✗ NO business logic
  ✗ NO data access

Controllers:
  ✓ Handle HTTP semantics
  ✓ Validate DTOs
  ✓ Call services
  ✗ NO raw database queries
  ✗ NO CV algorithms

Services:
  ✓ Business logic
  ✓ Orchestration
  ✓ Call repositories & CV modules
  ✗ NO HTTP knowledge
  ✗ NO database queries

Repositories:
  ✓ Database operations
  ✗ NO business logic
  ✗ NO HTTP knowledge

Proctoring:
  ✓ Computer vision
  ✓ Reusable
  ✗ NO business domain knowledge
  ✗ NO HTTP/DB knowledge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TESTING STRATEGY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

tests/
├── unit/
│   ├── test_exam_service.py       # Service logic (mock DB)
│   ├── test_violation_rules.py    # Rules engine
│   └── test_proctoring.py         # CV modules
│
├── integration/
│   ├── test_exam_flow.py          # End-to-end exam
│   └── test_proctoring_flow.py    # Proctoring flow
│
└── api/
    ├── test_exam_endpoints.py     # REST API tests
    └── test_auth.py               # Authentication

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

if __name__ == "__main__":
    print(PROJECT_STRUCTURE)
