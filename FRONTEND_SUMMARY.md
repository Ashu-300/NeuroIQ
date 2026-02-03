# NeuroIQ Frontend Architecture & UI Documentation

> Single source of truth for frontend structure, responsibilities, and UI behavior.

---

## Overview
This document defines the complete frontend architecture, folder structure, and UI responsibilities for NeuroIQ.

**Audience**: Frontend developers building the UI layer aligned with backend services and product requirements.

**Includes**
- Tech stack
- Folder structure
- Page-level responsibilities
- Component-level responsibilities
- Feature-wise UI behavior

**Excludes**
- Backend logic
- Server code

---

## Table of Contents
1. Frontend Tech Stack
2. High-Level Architecture
3. App Bootstrap (src/app)
4. Authentication Layer (src/auth)
5. API Layer (src/api)
6. Layouts (src/layouts)
7. Pages (src/pages)
8. Reusable Components (src/components)
9. Feature Modules (src/features)
10. WebSocket Layer (src/websocket)
11. Custom Hooks (src/hooks)
12. Utilities (src/utils)

---

## 1) Frontend Tech Stack

| Category | Choice |
|---|---|
| Framework | React.js |
| Styling | Tailwind CSS |
| Language | JavaScript (ES6+) |
| Routing | React Router v6 |
| State Management | React Context (Redux optional) |
| Networking | Axios |
| Forms | React Hook Form |
| Authentication | JWT (Bearer token) |
| File Uploads | multipart/form-data |
| Real-time | Native WebSocket (proctoring) |
| Build Tool | Vite |

---

## 2) High-Level Architecture

```
src/
│
├── app/                # App bootstrap & global providers
├── auth/               # Authentication & route protection
├── api/                # Backend API abstraction layer
├── layouts/            # Role-based layouts
├── pages/              # Route-level pages
├── components/         # Reusable UI components
├── features/           # Domain-specific UI modules
├── hooks/              # Custom React hooks
├── websocket/          # Proctoring WebSocket logic
├── utils/              # Helpers & constants
├── styles/             # Global styles & Tailwind setup
└── types/              # Shared data shape definitions
```

---

## 3) App Bootstrap (src/app)

```
src/app/
├── App.jsx
├── Router.jsx
├── Providers.jsx
└── ErrorBoundary.jsx
```

**Responsibilities**
- `App.jsx`: Root React component; initializes providers and routing.
- `Router.jsx`: Defines routes; separates by role (Admin, Teacher, Student).
- `Providers.jsx`: Auth provider, global app context, toast/notification providers.
- `ErrorBoundary.jsx`: Catches runtime UI errors; renders fallback UI.

---

## 4) Authentication Layer (src/auth)

```
src/auth/
├── AuthContext.jsx
├── AuthGuard.jsx
├── RoleGuard.jsx
└── useAuth.js
```

**Responsibilities**
- JWT storage and decoding
- Logged-in user context
- Role-based access control
- Route redirection for unauthorized users

---

## 5) API Layer (src/api)

```
src/api/
├── axios.js
├── auth.api.js
├── ingestion.api.js
├── llm.api.js
├── question.api.js
├── management.api.js
└── proctoring.api.js
```

**Responsibilities**
- Centralized Axios configuration
- JWT interceptor
- Error normalization
- Each service file maps directly to a backend service

**Rule**: No UI logic in this layer.

---

## 6) Layouts (src/layouts)

```
src/layouts/
├── AdminLayout.jsx
├── TeacherLayout.jsx
├── StudentLayout.jsx
└── AuthLayout.jsx
```

**Responsibilities**
- Sidebar and top navigation
- Role-specific menu items
- Consistent spacing and structure
- Logout and profile access

---

## 7) Pages (src/pages)

### Authentication Pages
```
src/pages/auth/
├── LoginPage.jsx
├── SignupPage.jsx
└── ProfilePage.jsx
```

**Features**
- Login and registration
- JWT acquisition
- Profile view and update

---

### Teacher Pages
```
src/pages/teacher/
├── Dashboard.jsx
├── UploadSyllabusPage.jsx
├── GeneratedQuestionsPage.jsx
├── QuestionBankPage.jsx
├── CreateExamPage.jsx
└── ExamListPage.jsx
```

**Features**
- Upload syllabus PDF
- View AI-generated questions
- Edit and save questions
- Build exams from question bank
- Manage created exams

---

### Admin Pages
```
src/pages/admin/
├── Dashboard.jsx
├── RoomManagementPage.jsx
├── SeatingGenerationPage.jsx
├── SeatingViewPage.jsx
└── AttendancePage.jsx
```

**Features**
- Register rooms (single and bulk)
- Generate seating arrangements
- Visual room layout (grid)
- Mark and review attendance

---

### Student Pages
```
src/pages/student/
├── Dashboard.jsx
├── ExamLaunchPage.jsx
├── IdentityVerificationPage.jsx
├── ProctoringExamPage.jsx
├── ExamSubmissionPage.jsx
└── ExamReportPage.jsx
```

**Features**
- Start exam session
- Webcam-based identity verification
- Live proctoring interface
- Manual or auto submission
- Violation report view

---

## 8) Reusable Components (src/components)

```
src/components/
├── ui/
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Modal.jsx
│   ├── Table.jsx
│   └── Loader.jsx
│
├── navigation/
│   ├── Sidebar.jsx
│   ├── Navbar.jsx
│   └── Breadcrumbs.jsx
│
└── feedback/
    ├── Toast.jsx
    └── EmptyState.jsx
```

**Responsibilities**
- Design-system level components
- Tailwind-based styling
- No business logic
- Fully reusable

---

## 9) Feature Modules (src/features)

### Question Feature
```
src/features/question/
├── QuestionCard.jsx
├── QuestionEditor.jsx
├── MCQRenderer.jsx
├── TheoryRenderer.jsx
├── QuestionFilter.jsx
└── QuestionList.jsx
```

**UI Behavior**
- Render theory questions with marks
- Render MCQs with options and correct answer
- Inline editing with validation
- Difficulty and category tags

---

### Exam Feature
```
src/features/exam/
├── ExamWizard.jsx
├── ExamQuestionSelector.jsx
├── ExamPreview.jsx
└── ExamSummary.jsx
```

**UI Behavior**
- Step-by-step exam creation
- Select questions from bank
- Total marks validation
- Final preview before publish

---

### Seating Feature
```
src/features/seating/
├── RoomForm.jsx
├── RoomGrid.jsx
├── SeatCell.jsx
├── SeatingFilters.jsx
└── SeatingLegend.jsx
```

**UI Behavior**
- Grid-based seating visualization
- Color-coded branches
- Hover tooltips for student details
- Printable seating layouts

---

### Proctoring Feature
```
src/features/proctoring/
├── CameraPreview.jsx
├── ViolationBanner.jsx
├── WarningCounter.jsx
├── ProctoringStatus.jsx
└── AutoSubmitModal.jsx
```

**UI Behavior**
- Live webcam preview
- Real-time violation alerts
- Warning counter with animations
- Auto-submit confirmation modal

---

## 10) WebSocket Layer (src/websocket)

```
src/websocket/
├── proctoring.socket.js
├── useProctoringSocket.js
└── messageHandlers.js
```

**Responsibilities**
- Establish WebSocket connection
- Attach JWT during handshake
- Stream frames
- Handle violation and auto-submit events

---

## 11) Custom Hooks (src/hooks)

```
src/hooks/
├── useUpload.js
├── usePagination.js
├── useDebounce.js
├── useCamera.js
└── useWebSocket.js
```

---

## 12) Utilities (src/utils)

```
src/utils/
├── constants.js
├── roles.js
├── validators.js
└── fileHelpers.js
```
---

## 13. Types & Data Shapes (`src/types/`)

```

src/types/
├── user.js
├── question.js
├── exam.js
├── room.js
├── seating.js
└── proctoring.js

```

---

## 14. UI & UX Principles

- Role-aware navigation
- Minimal cognitive load
- Visual feedback for AI actions
- Clear warnings during online exams
- Printable and exportable seating plans
- Calm & focused student exam interface

---

## 15. Summary

NeuroIQ’s frontend is **workflow-driven**, not CRUD-based.

- Teachers focus on **content creation**
- Admins focus on **operations**
- Students experience **secure, distraction-free exams**

This architecture ensures scalability, maintainability, and clean separation of concerns across the entire frontend system.
```

---


