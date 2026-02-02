"""
Routes for exam submission and reporting
"""
from fastapi import APIRouter, Depends

from app.core.security import get_current_user, AuthContext
from app.dto.exam_dto import (
    SubmitExamRequestDTO,
    SubmitExamResponseDTO,
    ExamReportResponseDTO,
)
from app.controller.submission_controller import SubmissionController


router = APIRouter(prefix="/api/proctoring/submission", tags=["submission"])


@router.post("/submit", response_model=SubmitExamResponseDTO)
async def submit_exam(
    request: SubmitExamRequestDTO,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Submit completed exam.
    
    Requires:
    - Valid JWT token
    - Session ID in request body
    """
    return await SubmissionController.submit_exam(request, current_user)


@router.get("/report/{session_id}", response_model=ExamReportResponseDTO)
async def get_exam_report(
    session_id: str,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Get exam submission report with violations.
    
    Requires:
    - Valid JWT token
    - Session ID in URL path
    """
    return await SubmissionController.get_exam_report(session_id, current_user)
