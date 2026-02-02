"""
Data Transfer Objects (DTOs) for exam operations
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ==================== Request DTOs ====================

class StartExamRequestDTO(BaseModel):
    """Request to start a new exam"""
    exam_id: str = Field(..., min_length=1, description="ID of the exam to start")


class VerifyIdentityRequestDTO(BaseModel):
    """Request to verify student identity"""
    session_id: str = Field(..., description="ID of the exam session")
    frame_base64: str = Field(..., description="Base64 encoded webcam frame")


class SubmitExamRequestDTO(BaseModel):
    """Request to submit exam"""
    session_id: str = Field(..., description="ID of the exam session")


# ==================== Response DTOs ====================

class StartExamResponseDTO(BaseModel):
    """Response when exam is started"""
    session_id: str
    exam_id: str
    start_time: datetime
    status: str


class ExamStatusResponseDTO(BaseModel):
    """Current status of an exam session"""
    session_id: str
    status: str
    start_time: datetime
    elapsed_seconds: int
    warnings: int


class VerifyIdentityResponseDTO(BaseModel):
    """Response when identity is verified"""
    verified: bool
    message: str
    session_id: str


class SubmitExamResponseDTO(BaseModel):
    """Response when exam is submitted"""
    session_id: str
    status: str
    submitted_at: datetime
    total_warnings: int
    violations_count: int


class ViolationDetailDTO(BaseModel):
    """Individual violation detail"""
    violation_id: str
    session_id: str
    violation_type: str
    severity: str
    timestamp: datetime
    description: Optional[str] = None


class ExamReportResponseDTO(BaseModel):
    """Final exam submission report"""
    session_id: str
    student_id: str
    exam_id: str
    start_time: datetime
    end_time: datetime
    duration_seconds: int
    status: str
    total_warnings: int
    violations: list[ViolationDetailDTO] = []
    identity_verified: bool


# ==================== Error DTOs ====================

class ErrorResponseDTO(BaseModel):
    """Error response"""
    detail: str
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ==================== WebSocket DTOs ====================

class ProctorFrameRequestDTO(BaseModel):
    """WebSocket frame data from client"""
    frame: str = Field(..., description="Base64 encoded image")
    timestamp: float = Field(..., description="Unix timestamp")


class ProctorFrameResponseDTO(BaseModel):
    """WebSocket response for frame processing"""
    status: str = Field(..., description="ok|error|auto_submit")
    processed: bool = True
    auto_submit: bool = False
    timestamp: Optional[float] = None
    violation_message: Optional[str] = None
    message: Optional[str] = None
