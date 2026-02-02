"""
Routes for proctoring operations
"""
from fastapi import APIRouter, Depends, UploadFile, File

from app.core.security import get_current_user, AuthContext
from app.dto.exam_dto import VerifyIdentityResponseDTO
from app.controller.proctor_controller import ProctorController


router = APIRouter(prefix="/api/proctoring/proctor", tags=["proctoring"])
controller = ProctorController()


@router.post("/verify-identity", response_model=VerifyIdentityResponseDTO)
async def verify_identity(
    session_id: str,
    frame: UploadFile = File(...),
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Verify student identity at exam start with single face check.
    
    Requires:
    - Valid JWT token
    - Session ID query parameter
    - Webcam frame image file
    """
    return await controller.verify_identity(session_id, frame, current_user)
