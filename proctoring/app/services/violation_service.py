"""
Violation tracking and reporting service
"""
from typing import List

from app.db.repositories import ViolationRepository
from app.models.exam import Violation


class ViolationService:
    """Service for violation tracking and reporting"""

    @staticmethod
    async def get_session_violations(session_id: str) -> List[Violation]:
        """
        Get all violations for a session.
        
        Args:
            session_id: Exam session ID
            
        Returns:
            List of violations (database models)
        """
        return await ViolationRepository.get_violations(session_id)

    @staticmethod
    async def count_critical_violations(session_id: str) -> int:
        """
        Count critical violations in a session.
        
        Args:
            session_id: Exam session ID
            
        Returns:
            Count of critical violations
        """
        return await ViolationRepository.count_critical_violations(session_id)
