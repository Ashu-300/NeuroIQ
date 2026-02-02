"""
Controller for exam lifecycle operations
"""
from fastapi import HTTPException, status
from datetime import datetime

from app.core.security import AuthContext
from app.dto.exam_dto import (
    StartExamRequestDTO,
    StartExamResponseDTO,
    ExamStatusResponseDTO,
    SubmitExamRequestDTO,
    SubmitExamResponseDTO,
)
from app.services.exam_service import ExamService
from app.utils.time import get_elapsed_seconds
from app.core.logging import logger


class ExamController:
    """Controller for exam operations"""

    @staticmethod
    async def start_exam(
        request: StartExamRequestDTO,
        current_user: AuthContext,
    ) -> StartExamResponseDTO:
        """
        Start a new exam session.
        
        Args:
            request: Start exam request DTO
            current_user: Authenticated user context
            
        Returns:
            StartExamResponseDTO
            
        Raises:
            HTTPException: If exam creation fails
        """
        try:
            session = await ExamService.create_exam_session(
                student_id=current_user.user_id,
                exam_id=request.exam_id,
            )

            logger.info(
                f"Exam started for student {current_user.user_id}",
                extra={"exam_id": request.exam_id, "session_id": session.session_id},
            )

            return StartExamResponseDTO(
                session_id=session.session_id,
                exam_id=session.exam_id,
                start_time=session.start_time,
                status=session.status.value,
            )

        except Exception as e:
            logger.error(
                f"Error starting exam: {str(e)}",
                extra={"user_id": current_user.user_id},
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to start exam: {str(e)}",
            )

    @staticmethod
    async def get_exam_status(
        session_id: str,
        current_user: AuthContext,
    ) -> ExamStatusResponseDTO:
        """
        Get current exam session status.
        
        Args:
            session_id: Session ID
            current_user: Authenticated user context
            
        Returns:
            ExamStatusResponseDTO
            
        Raises:
            HTTPException: If session not found or unauthorized
        """
        try:
            session = await ExamService.get_exam_session(session_id)

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Session {session_id} not found",
                )

            # Verify ownership
            if session.student_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this session",
                )

            elapsed = get_elapsed_seconds(session.start_time)

            return ExamStatusResponseDTO(
                session_id=session.session_id,
                status=session.status.value,
                start_time=session.start_time,
                elapsed_seconds=elapsed,
                warnings=session.warnings,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting exam status: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get exam status: {str(e)}",
            )

    @staticmethod
    async def submit_exam(
        request: SubmitExamRequestDTO,
        current_user: AuthContext,
    ) -> SubmitExamResponseDTO:
        """
        Submit completed exam.
        
        Args:
            request: Submit exam request DTO
            current_user: Authenticated user context
            
        Returns:
            SubmitExamResponseDTO
            
        Raises:
            HTTPException: If session not found or unauthorized
        """
        try:
            # Verify session exists and belongs to user
            session = await ExamService.get_exam_session(request.session_id)

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Session {request.session_id} not found",
                )

            if session.student_id != current_user.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to submit this exam",
                )

            # Submit exam
            updated_session = await ExamService.submit_exam(request.session_id)

            logger.info(
                f"Exam submitted: {request.session_id}",
                extra={"user_id": current_user.user_id},
            )

            return SubmitExamResponseDTO(
                session_id=updated_session.session_id,
                status=updated_session.status.value,
                submitted_at=updated_session.end_time or datetime.utcnow(),
                total_warnings=updated_session.warnings,
                violations_count=updated_session.violation_count,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error submitting exam: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit exam: {str(e)}",
            )
