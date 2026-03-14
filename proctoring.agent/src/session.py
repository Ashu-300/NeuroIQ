"""
Session state module for storing proctoring session information.
"""
from typing import Optional
from pydantic import BaseModel


class SessionInfo(BaseModel):
    """Model for proctoring session information."""
    session_id: str
    student_id: str
    exam_id: str


# Global session state
_session_info: Optional[SessionInfo] = None


def set_session(session_id: str, student_id: str, exam_id: str):
    """Store session information globally."""
    global _session_info
    _session_info = SessionInfo(
        session_id=session_id,
        student_id=student_id,
        exam_id=exam_id
    )


def get_session() -> Optional[SessionInfo]:
    """Retrieve the current session information."""
    return _session_info


def clear_session():
    """Clear the session information."""
    global _session_info
    _session_info = None
