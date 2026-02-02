"""
Controller for proctoring operations
"""
import base64
from fastapi import HTTPException, UploadFile, status

from app.core.security import AuthContext
from app.dto.exam_dto import VerifyIdentityResponseDTO
from app.services.proctoring_service import ProctoringService
from app.services.exam_service import ExamService
from app.core.logging import logger


class ProctorController:
    """Controller for proctoring operations"""

    def __init__(self):
        """Initialize with proctoring service"""
        self.proctoring_service = ProctoringService()

    async def verify_identity(
        self,
        session_id: str,
        frame: UploadFile,
        current_user: AuthContext,
    ) -> VerifyIdentityResponseDTO:
        """
        Verify student identity at exam start.
        
        Args:
            session_id: Exam session ID
            frame: Webcam frame image file
            current_user: Authenticated user context
            
        Returns:
            VerifyIdentityResponseDTO
            
        Raises:
            HTTPException: If verification fails or unauthorized
        """
        try:
            # Verify session ownership
            session = await ExamService.get_exam_session(session_id)
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Session {session_id} not found",
                )

            if session.student_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this session",
                )

            # Read frame
            frame_bytes = await frame.read()
            frame_base64 = base64.b64encode(frame_bytes).decode("utf-8")

            # Verify identity
            verified, error = await self.proctoring_service.verify_initial_identity(
                session_id,
                frame_base64,
            )

            if not verified:
                logger.warning(
                    f"Identity verification failed for session {session_id}",
                    extra={"error": error, "user_id": current_user.user_id},
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Identity verification failed: {error}",
                )

            logger.info(
                f"Identity verified for session {session_id}",
                extra={"user_id": current_user.user_id},
            )

            return VerifyIdentityResponseDTO(
                verified=True,
                message="Identity verification successful",
                session_id=session_id,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying identity: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to verify identity: {str(e)}",
            )
