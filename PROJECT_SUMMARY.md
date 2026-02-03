# NeuroIQ Project Overview (Non-technical Product Summary)

## What this product does
NeuroIQ is an examination management system that helps institutes run both offline and online exams with automation and AI support. The platform is built around the idea that teachers and admins should spend less time on manual work (question creation, seating plans, monitoring) and more time on teaching and evaluation.

Key outcomes the system delivers:
- Create and manage users (teachers, admins, students).
- Upload syllabus/material and get AI-generated question drafts.
- Store and organize question sets and complete exams.
- Generate fair seating plans for offline exams.
- Run online exams with AI proctoring and reporting.

This document explains the full experience and capabilities for a front-end developer to build the UI and user flows. API details are intentionally excluded because the existing service summary already provides them.

---

## Who uses the system
**Admin**
- Manages rooms, seating plans, and attendance for offline exams.
- Oversees exam operations and compliance.

**Teacher**
- Uploads syllabus/material.
- Generates and curates questions.
- Assembles exams from question sets.

**Student**
- Takes online exams under proctoring.
- Gets verified identity at exam start.

---

## Core Features (Grouped by user needs)

### 1) Secure access and profiles
The platform has role-based access (admin, teacher, student). Each user has a profile with essential information and permissions. Students can be linked to teacher/admin accounts where required. This enables role-specific screens and actions.

What the UI should support:
- Sign up and login screens.
- Role-aware dashboards.
- Basic profile management.

---

### 2) Syllabus and material ingestion (teacher/admin)
Teachers can upload a PDF syllabus or course material. The system automatically extracts text, cleans it, splits it by units, and runs AI generation for question drafts. The uploaded file is stored, and the extracted syllabus is tracked along with metadata.

What the UI should support:
- Upload PDF with metadata (subject, role, optional marks distribution).
- Show upload status and generated question drafts per unit.
- List uploaded materials with a view option.

User result:
- A teacher uploads a syllabus and immediately gets a structured set of AI-generated questions, ready for review.

---

### 3) Question bank and exam creation (teacher/admin)
Teachers can save question drafts into a persistent question bank. Two types of questions are supported:
- Theory questions (with marks per question)
- MCQ questions (with options and correct answer)

Once questions are saved, the teacher can assemble them into full exams. These exams are stored and can later be used for delivery or reporting.

What the UI should support:
- Question review/edit before saving.
- Question bank listing and filters (subject, semester, category).
- Exam creation wizard (select questions, finalize exam).

User result:
- A curated and reusable repository of questions and ready-made exams.

---

### 4) Offline exam seating arrangement (admin)
Admins can register rooms with capacity details (rows, columns) and branch restrictions. The system can automatically generate seating arrangements using AI, ensuring:
- Students are distributed fairly.
- Branch rules are respected.
- Seating avoids placing same-branch students together when possible.

The seating plan is saved and can be used for invigilation and attendance.

What the UI should support:
- Room management (add single room or bulk upload).
- Seating generation request (select branch/semester/prefix filters).
- Visual seating plan view (room layout grid).

User result:
- Quick, fair, and conflict-free seating plans without manual effort.

---

### 5) Attendance tracking (admin)
During offline exams, attendance can be recorded for each student and linked to a room and seat. This enables a clear exam record and later analysis.

What the UI should support:
- Attendance marking interface.
- Per-exam attendance summary.

User result:
- Accurate attendance tracking tied to exam and seating.

---

### 6) Online exams with AI proctoring (student + admin)
For online exams, the system provides an AI proctoring experience:
- Exam sessions are started for a student.
- Identity is verified with a single webcam snapshot.
- A live webcam feed is monitored for violations (face not visible, multiple faces, looking away, etc.).
- Warnings are counted. If thresholds are exceeded, the exam can be auto-submitted.
- Final reports include violations and summary data.

What the UI should support:
- Exam launch page with session status.
- Identity verification step (camera snapshot upload).
- Live proctoring screen (camera preview + warnings).
- Submission confirmation and report view.

User result:
- Secure online exams with automated integrity checks and reporting.

---

## Typical User Journeys

### Teacher journey (question creation)
1. Log in as teacher.
2. Upload syllabus PDF.
3. Review AI-generated questions.
4. Save question sets into the bank.
5. Assemble and publish an exam.

### Admin journey (offline exam setup)
1. Register rooms (layout/capacity).
2. Select branch/semester filter.
3. Generate seating plan and download/print layout.
4. Mark attendance during the exam.

### Student journey (online exam)
1. Log in and open exam.
2. Verify identity using webcam snapshot.
3. Take the exam while proctoring runs in the background.
4. Submit and view completion status.

---

## What data the UI should collect or display
**Authentication & profiles**
- User info (name, email, role, institution)
- Student profile (roll no, branch, semester, section)

**Ingestion**
- Subject
- Uploaded file (PDF)
- Mark distribution for question types (optional)
- Generated question drafts

**Question bank**
- Question content
- Category (theory/MCQ)
- Marks (for theory)
- Options & correct answer (for MCQ)

**Exam creation**
- Exam metadata (subject, semester, category)
- Selected questions

**Seating**
- Room details (rows, columns, branch restrictions)
- Generated seating layout by room

**Proctoring**
- Session status
- Identity verification result
- Warnings/violations
- Submission report summary

---

## Implementation Notes for Frontend
- The UI should be role-aware and show different navigation for admin, teacher, and student.
- File uploads (PDFs, identity snapshots) require multipart form support.
- Live proctoring uses a WebSocket connection to stream webcam frames.
- The seating plan is naturally visualized as room grids.
- Question review/edit is essential before saving to the question bank.

---

## Summary
NeuroIQ is a complete exam platform that combines AI-assisted question generation, automated offline seating, and secure online proctoring. The frontend should focus on clear role-based flows, visual tools for seating and proctoring, and smooth content creation workflows for teachers.
