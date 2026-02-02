# NeuroIQ Exam Service - Architecture Guide

## Overview

The exam service follows a **layered hexagonal (ports & adapters) architecture** with strict separation of concerns.

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                  │
└──────────────┬──────────────────────────────────────┘
               │
        ┌──────▼──────┐
        │  FastAPI    │  (HTTP Framework)
        └──────┬──────┘
               │
    ┌──────────▼──────────────┐
    │  ROUTES / API LAYER     │  (exam_routes, proctor_routes, etc.)
    │  ├─ Route Definitions   │  - Extract parameters
    │  ├─ DTOs Validation     │  - Apply middleware
    │  └─ Error Handling      │  - No business logic
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────┐
    │ CONTROLLER LAYER        │  (exam_controller, proctor_controller, etc.)
    │ ├─ Request Handling     │  - Validate DTOs
    │ ├─ Auth/Authorization   │  - Call services
    │ └─ Response Formatting  │  - Error handling
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────────┐
    │ SERVICE LAYER           │  (exam_service, proctoring_service, etc.)
    │ ├─ Business Logic       │  - Orchestrate operations
    │ ├─ Orchestration        │  - Call repositories & CV
    │ └─ Domain Rules         │  - Generate reports
    └────┬─────────┬──────────┘
         │         │
   ┌─────▼──┐  ┌──▼────────────┐
   │ PROCTORING          │
   │ ├─ Face Detection   │
   │ ├─ Eye Tracking     │
   │ ├─ Head Pose        │
   │ └─ Violation Rules  │
   └─────────┘  └────────────────┘
                    │
         ┌──────────▼──────────────┐
         │ REPOSITORY LAYER        │  (ExamSessionRepository, ViolationRepository)
         │ ├─ CRUD Operations      │  - Database queries
         │ ├─ Indexes              │  - Entity mapping
         │ └─ Transactions         │  - No business logic
         └──────────┬──────────────┘
                    │
         ┌──────────▼──────────────┐
         │ DATABASE                │  (MongoDB)
         │ ├─ exam_sessions        │
         │ └─ violations           │
         └─────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DATA MODELS                                          │
│ ├─ DTOs (Request/Response)  → API contracts         │
│ └─ Models (DB Entities)     → Database records      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ CROSS-CUTTING CONCERNS                              │
│ ├─ Authentication (JWT)                             │
│ ├─ Structured Logging                              │
│ ├─ Error Handling                                   │
│ └─ Configuration (Environment)                      │
└─────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### 1. Routes Layer (`app/routes/`)

**Files:**
- `exam_routes.py` - Exam lifecycle endpoints
- `proctor_routes.py` - Identity verification endpoints
- `submission_routes.py` - Submission and reporting endpoints

**Responsibilities:**
- Define FastAPI route definitions
- Extract path, query, and body parameters
- Apply dependency injection (authentication)
- Delegate to controllers
- Minimal logic - just HTTP mechanics

**Example:**
```python
@router.post("/start", response_model=StartExamResponseDTO)
async def start_exam(
    request: StartExamRequestDTO,  # DTO validation
    current_user: AuthContext = Depends(get_current_user),  # Auth
):
    return await ExamController.start_exam(request, current_user)
```

**NOT Allowed:**
- ❌ Business logic
- ❌ Database queries
- ❌ Exception handling (except validation)

---

### 2. Controller Layer (`app/controller/`)

**Files:**
- `exam_controller.py` - Exam operation handlers
- `proctor_controller.py` - Proctoring handlers
- `submission_controller.py` - Submission handlers

**Responsibilities:**
- Parse and validate HTTP requests (via DTOs)
- Call appropriate services
- Transform service responses to response DTOs
- Handle authentication/authorization checks
- Application-level error handling
- Logging (request/response)

**Example:**
```python
class ExamController:
    @staticmethod
    async def start_exam(
        request: StartExamRequestDTO,
        current_user: AuthContext,
    ) -> StartExamResponseDTO:
        # Validate authorization
        # Call service
        session = await ExamService.create_exam_session(...)
        # Transform to DTO
        return StartExamResponseDTO(...)
```

**NOT Allowed:**
- ❌ Raw database queries
- ❌ Computer vision algorithms
- ❌ Direct HTTP response handling (use DTOs)

---

### 3. Service Layer (`app/services/`)

**Files:**
- `exam_service.py` - Exam session management
- `proctoring_service.py` - CV-based violation detection
- `violation_service.py` - Violation tracking

**Responsibilities:**
- Core business logic
- Orchestrate repositories and proctoring modules
- Enforce business rules
- Generate reports
- Transaction management (if needed)

**Example:**
```python
class ExamService:
    @staticmethod
    async def create_exam_session(student_id: str, exam_id: str):
        # Business logic: validate exam exists (if needed)
        # Orchestrate: call repository
        session = await ExamSessionRepository.create_session(...)
        # Logging
        logger.info("Exam created")
        return session
```

**NOT Allowed:**
- ❌ HTTP knowledge (no request/response)
- ❌ Direct MongoDB queries (use repositories)
- ❌ Route definitions

---

### 4. Proctoring Layer (`app/proctoring/`)

**Files:**
- `face_detection.py` - MediaPipe face detection
- `eye_tracking.py` - Gaze direction detection
- `head_pose.py` - Head rotation estimation
- `rules.py` - Violation rules engine

**Responsibilities:**
- Computer vision algorithms
- Violation rule enforcement
- Reusable and testable
- No domain-specific knowledge

**Example:**
```python
class FaceDetector:
    def detect_faces(self, image: np.ndarray) -> Tuple[List[dict], int]:
        # Pure CV logic - no domain knowledge
        # Returns faces and count
        return faces, len(faces)
```

**NOT Allowed:**
- ❌ Database access
- ❌ HTTP knowledge
- ❌ Domain-specific rules (belong in services)

---

### 5. Repository Layer (`app/db/`)

**Files:**
- `mongo.py` - MongoDB connection management
- `repositories.py` - CRUD operations

**Responsibilities:**
- Database connection management
- Query execution
- Entity mapping (MongoDB ↔ Pydantic models)
- Index creation

**Example:**
```python
class ExamSessionRepository:
    @classmethod
    async def create_session(cls, student_id: str, exam_id: str):
        collection = cls._get_collection()
        await collection.insert_one(session_data)
        return ExamSession(**session_data)
```

**NOT Allowed:**
- ❌ Business logic
- ❌ HTTP knowledge
- ❌ Domain rules

---

### 6. Data Models

#### DTOs (`app/dto/exam_dto.py`)
Request/response data transfer objects

**Usage:**
- Input validation (FastAPI automatic)
- Response serialization
- API contracts

```python
class StartExamRequestDTO(BaseModel):
    exam_id: str
    # FastAPI validates this automatically
```

#### Models (`app/models/exam.py`)
Database entity definitions

**Usage:**
- Database record structure
- Repository operations
- Type safety in services

```python
class ExamSession(BaseModel):
    session_id: str
    student_id: str
    status: ExamStatusEnum
```

---

## Request Flow Example

### Start Exam - Complete Flow

```
1. CLIENT SENDS REQUEST
   POST /exam/start
   {
     "exam_id": "exam_123"
   }
   Headers: Authorization: Bearer <JWT>

2. FASTAPI VALIDATION
   → StartExamRequestDTO validated
   → JWT token verified via get_current_user()

3. ROUTE HANDLER (exam_routes.py)
   start_exam(request, current_user)
   → Delegates to controller

4. CONTROLLER (exam_controller.py)
   ExamController.start_exam()
   ├─ Verify authorization (current_user.user_id matches)
   ├─ Call service
   ├─ Transform response to DTO
   ├─ Log operation
   └─ Return StartExamResponseDTO

5. SERVICE (exam_service.py)
   ExamService.create_exam_session(student_id, exam_id)
   ├─ (Validate business rules if needed)
   ├─ Call repository
   └─ Return ExamSession (DB model)

6. REPOSITORY (repositories.py)
   ExamSessionRepository.create_session()
   ├─ Generate session_id (UUID)
   ├─ Create document
   ├─ Insert into MongoDB
   └─ Return mapped ExamSession model

7. DATABASE (MongoDB)
   exam_sessions collection
   → Document stored with indexes

8. RESPONSE SERIALIZATION
   ExamSession → StartExamResponseDTO (Pydantic)
   → JSON response

9. CLIENT RECEIVES
   200 OK
   {
     "session_id": "uuid",
     "exam_id": "exam_123",
     "start_time": "2024-01-31T10:00:00",
     "status": "active"
   }
```

---

## Dependency Flow

```
Routes
  ↓
Controllers
  ↓
Services
  ├─ Proctoring Modules
  └─ Repositories
     ↓
     MongoDB
```

**Key Points:**
- Dependencies flow downward
- No circular dependencies
- Each layer has single responsibility
- Easy to test (mock dependencies)

---

## Testing Strategy

### Unit Tests (No mocking needed for pure logic)
```python
# test_violation_rules.py
def test_violation_threshold():
    rules = ViolationRulesEngine()
    # Pure logic - no mocks
```

### Integration Tests (Mock external dependencies)
```python
# test_exam_service.py
async def test_create_exam_session():
    # Mock repository
    with patch.object(ExamSessionRepository, 'create_session'):
        service = ExamService()
        # Test orchestration logic
```

### API Tests (Test full stack)
```python
# test_exam_endpoints.py
async def test_start_exam():
    async with AsyncClient(app=app) as client:
        # Full request/response flow
        response = await client.post("/exam/start", ...)
```

---

## Adding New Features

### Example: Add "Pause Exam" Endpoint

1. **Define DTO** (`app/dto/exam_dto.py`)
   ```python
   class PauseExamRequestDTO(BaseModel):
       session_id: str
   
   class PauseExamResponseDTO(BaseModel):
       session_id: str
       status: str
       paused_at: datetime
   ```

2. **Add Route** (`app/routes/exam_routes.py`)
   ```python
   @router.post("/pause", response_model=PauseExamResponseDTO)
   async def pause_exam(request, current_user):
       return await ExamController.pause_exam(request, current_user)
   ```

3. **Add Controller Method** (`app/controller/exam_controller.py`)
   ```python
   @staticmethod
   async def pause_exam(request, current_user):
       # Validation, auth, call service
       session = await ExamService.pause_exam(request.session_id)
       return PauseExamResponseDTO(...)
   ```

4. **Add Service Method** (`app/services/exam_service.py`)
   ```python
   @staticmethod
   async def pause_exam(session_id: str):
       await ExamSessionRepository.update_session_status(
           session_id, ExamStatusEnum.PAUSED
       )
   ```

5. **Add Repository Method** (`app/db/repositories.py`)
   ```python
   @classmethod
   async def update_session_status(cls, session_id, status):
       collection = cls._get_collection()
       await collection.update_one(...)
   ```

**Flow:** Route → Controller → Service → Repository → Database

---

## Configuration & Secrets

All configuration in `app/core/config.py`:

```python
class Settings(BaseSettings):
    SERVICE_NAME: str = "exam"
    SERVICE_PORT: int = 8000
    JWT_PUBLIC_KEY: str  # From environment
    MONGO_URI: str       # From environment
    
    class Config:
        env_file = ".env"
```

**Benefits:**
- ✅ Type-safe configuration
- ✅ Environment-based
- ✅ Validation at startup
- ✅ No hardcoded values

---

## Error Handling

### Layered Error Handling

1. **Routes:** FastAPI automatic (422 validation errors)
2. **Controllers:** Business logic errors (404, 403, 400)
3. **Services:** Domain errors (raise ValueError)
4. **Repositories:** Database errors (raise exception)

```python
# Controller (catch and transform)
try:
    session = await ExamService.get_exam_session(session_id)
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

---

## Logging

Structured JSON logging across all layers:

```json
{
  "timestamp": "2024-01-31T10:00:00Z",
  "level": "INFO",
  "logger": "app.services.exam_service",
  "message": "Exam created",
  "service": "exam",
  "user_id": "student_123"
}
```

Usage:
```python
logger.info("Exam created", extra={"user_id": student_id})
```

---

## Benefits of This Architecture

| Benefit | How |
|---------|-----|
| **Testability** | Each layer can be tested in isolation |
| **Reusability** | Services can be reused across routes |
| **Maintainability** | Clear responsibilities, easy to locate code |
| **Scalability** | Easy to add new features without affecting others |
| **Debugging** | Request/response flows are easy to trace |
| **Performance** | Layers can be optimized independently |
| **Security** | Authentication/authorization in one place |

---

## File Organization Checklist

When adding new functionality:

- [ ] Create DTO in `app/dto/`
- [ ] Create or update model in `app/models/`
- [ ] Create controller method
- [ ] Create route in `app/routes/`
- [ ] Create service method
- [ ] Create repository method (if DB access needed)
- [ ] Write tests
- [ ] Update documentation

---

## Quick Reference

| Layer | File | Responsibility |
|-------|------|---|
| Routes | `app/routes/*.py` | Define endpoints |
| Controllers | `app/controller/*.py` | Handle requests |
| Services | `app/services/*.py` | Business logic |
| Proctoring | `app/proctoring/*.py` | Computer vision |
| Repositories | `app/db/repositories.py` | Database CRUD |
| Models | `app/models/exam.py` | DB entities |
| DTOs | `app/dto/exam_dto.py` | API contracts |

---

## Summary

This architecture ensures:
- **Separation of Concerns:** Each layer has one job
- **Dependency Inversion:** High-level modules don't depend on low-level
- **Open/Closed Principle:** Easy to extend, hard to break
- **Single Responsibility:** Easy to test and maintain
- **Clean Code:** Readable and professional

Follow this structure for all new features!
