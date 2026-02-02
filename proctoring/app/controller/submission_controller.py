"""
Controller for exam submission and reporting
"""
from fastapi import HTTPException, status

from app.core.security import AuthContext
from app.dto.exam_dto import (
    SubmitExamRequestDTO,
    SubmitExamResponseDTO,
    ExamReportResponseDTO,
    ViolationDetailDTO,
)
from app.services.exam_service import ExamService
from app.services.violation_service import ViolationService
from app.core.logging import logger


class SubmissionController:
    """Controller for exam submission operations"""

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
            HTTPException: If submission fails
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
                submitted_at=updated_session.end_time,
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

    @staticmethod
    async def get_exam_report(
        session_id: str,
        current_user: AuthContext,
    ) -> ExamReportResponseDTO:
        """
        Get exam submission report with violations.
        
        Args:
            session_id: Exam session ID
            current_user: Authenticated user context
            
        Returns:
            ExamReportResponseDTO
            
        Raises:
            HTTPException: If report retrieval fails
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
                    detail="Not authorized to access this report",
                )

            # Get violations
            violations = await ViolationService.get_session_violations(session_id)

            # Convert violations to DTOs
            violation_dtos = [
                ViolationDetailDTO(
                    violation_id=v.violation_id,
                    session_id=v.session_id,
                    violation_type=v.violation_type.value,
                    severity=v.severity.value,
                    timestamp=v.timestamp,
                    description=f"{v.violation_type.value} - {v.severity.value}",
                )
                for v in violations
            ]

            # Generate report
            report = await ExamService.generate_exam_report(session_id, violation_dtos)

            logger.info(
                f"Exam report retrieved: {session_id}",
                extra={"user_id": current_user.user_id},
            )

            return ExamReportResponseDTO(
                session_id=report.session_id,
                student_id=report.student_id,
                exam_id=report.exam_id,
                start_time=report.start_time,
                end_time=report.end_time,
                duration_seconds=report.duration_seconds,
                status=report.status.value,
                total_warnings=report.total_warnings,
                violations=[v.model_dump() for v in violation_dtos],
                identity_verified=report.identity_verified,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting exam report: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get exam report: {str(e)}",
            )
