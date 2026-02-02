"""
Routes for exam lifecycle operations
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user, AuthContext
from app.dto.exam_dto import (
    StartExamRequestDTO,
    StartExamResponseDTO,
    ExamStatusResponseDTO,
)
from app.controller.exam_controller import ExamController


router = APIRouter(prefix="/api/proctoring/exam", tags=["exam"])


@router.post("/start", response_model=StartExamResponseDTO)
async def start_exam(
    request: StartExamRequestDTO,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Start a new exam session.
    
    Requires:
    - Valid JWT token
    - Exam ID
    """
    return await ExamController.start_exam(request, current_user)


@router.get("/status", response_model=ExamStatusResponseDTO)
async def get_exam_status(
    session_id: str,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Get current exam session status.
    
    Requires:
    - Valid JWT token
    - Session ID query parameter
    """
    return await ExamController.get_exam_status(session_id, current_user)
