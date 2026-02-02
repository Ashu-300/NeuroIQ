"""
Database models for exam service entities
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ExamStatusEnum(str, Enum):
    """Exam session status"""
    ACTIVE = "active"
    SUBMITTED = "submitted"
    AUTO_SUBMITTED = "auto_submitted"


class ViolationSeverityEnum(str, Enum):
    """Violation severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ViolationTypeEnum(str, Enum):
    """Types of violations"""
    NO_FACE = "NO_FACE"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    LOOKING_AWAY = "LOOKING_AWAY"
    HEAD_TURN = "HEAD_TURN"


# ==================== Database Models ====================

class ExamSession(BaseModel):
    """Exam session entity"""
    session_id: str = Field(..., alias="_id")
    student_id: str
    exam_id: str
    status: ExamStatusEnum
    start_time: datetime
    end_time: Optional[datetime] = None
    warnings: int = 0
    violation_count: int = 0
    identity_verified: bool = False
    identity_snapshot_base64: Optional[str] = None

    class Config:
        populate_by_name = True


class Violation(BaseModel):
    """Violation event entity"""
    violation_id: str = Field(..., alias="_id")
    session_id: str
    student_id: str
    violation_type: ViolationTypeEnum
    severity: ViolationSeverityEnum
    timestamp: datetime
    duration_seconds: Optional[float] = None
    metadata: Optional[dict] = None

    class Config:
        populate_by_name = True


class Identity(BaseModel):
    """Identity verification snapshot"""
    session_id: str
    student_id: str
    timestamp: datetime
    face_count: int
    faces_detected: bool
    snapshot_base64: str


class ExamReport(BaseModel):
    """Final exam submission report"""
    session_id: str
    student_id: str
    exam_id: str
    start_time: datetime
    end_time: datetime
    duration_seconds: int
    status: ExamStatusEnum
    total_warnings: int
    violations: List[dict] = []
    identity_verified: bool
