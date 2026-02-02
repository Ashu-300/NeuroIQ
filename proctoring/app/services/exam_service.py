"""
Exam management service
"""
from datetime import datetime
from typing import Optional, List

from app.db.repositories import ExamSessionRepository
from app.models.exam import ExamSession, ExamStatusEnum, ExamReport
from app.core.logging import logger


class ExamService:
    """Service for exam session management"""

    @staticmethod
    async def create_exam_session(
        student_id: str,
        exam_id: str,
    ) -> ExamSession:
        """
        Create a new exam session.
        
        Args:
            student_id: ID of the student
            exam_id: ID of the exam
            
        Returns:
            Created exam session (database model)
        """
        session = await ExamSessionRepository.create_session(student_id, exam_id)
        return session

    @staticmethod
    async def get_exam_session(session_id: str) -> Optional[ExamSession]:
        """
        Retrieve an exam session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Exam session (database model) or None if not found
        """
        return await ExamSessionRepository.get_session(session_id)

    @staticmethod
    async def submit_exam(
        session_id: str,
    ) -> Optional[ExamSession]:
        """
        Submit an exam session.
        
        Args:
            session_id: Session ID
            
        Returns:
            Updated exam session (database model)
        """
        # Update status to submitted
        await ExamSessionRepository.update_status(
            session_id,
            ExamStatusEnum.SUBMITTED,
            end_time=datetime.utcnow(),
        )

        session = await ExamSessionRepository.get_session(session_id)
        logger.info(f"Exam submitted: {session_id}")

        return session

    @staticmethod
    async def auto_submit_exam(
        session_id: str,
        reason: str = "violation_threshold",
    ) -> Optional[ExamSession]:
        """
        Auto-submit an exam due to violations.
        
        Args:
            session_id: Session ID
            reason: Reason for auto-submission
            
        Returns:
            Updated exam session (database model)
        """
        await ExamSessionRepository.update_status(
            session_id,
            ExamStatusEnum.AUTO_SUBMITTED,
            end_time=datetime.utcnow(),
        )

        session = await ExamSessionRepository.get_session(session_id)
        logger.warning(
            f"Exam auto-submitted: {session_id}",
            extra={"reason": reason},
        )

        return session

    @staticmethod
    async def generate_exam_report(
        session_id: str,
        violations: List,
    ) -> ExamReport:
        """
        Generate final exam report.
        
        Args:
            session_id: Session ID
            violations: List of violation DTOs
            
        Returns:
            Exam report (database model)
        """
        session = await ExamSessionRepository.get_session(session_id)

        if not session:
            raise ValueError(f"Session {session_id} not found")

        duration_seconds = int(
            (session.end_time - session.start_time).total_seconds()
        ) if session.end_time else 0

        report = ExamReport(
            session_id=session.session_id,
            student_id=session.student_id,
            exam_id=session.exam_id,
            start_time=session.start_time,
            end_time=session.end_time or datetime.utcnow(),
            duration_seconds=duration_seconds,
            status=session.status,
            total_warnings=session.warnings,
            violations=[v.model_dump() if hasattr(v, 'model_dump') else v for v in violations],
            identity_verified=session.identity_verified,
        )

        return report
