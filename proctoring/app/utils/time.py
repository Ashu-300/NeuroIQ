"""
Time and duration utilities
"""
from datetime import datetime, timedelta
from typing import Tuple


def get_elapsed_seconds(start_time: datetime) -> int:
    """
    Calculate elapsed seconds from a start time.
    
    Args:
        start_time: Start datetime
        
    Returns:
        Elapsed seconds (rounded)
    """
    elapsed = datetime.utcnow() - start_time
    return int(elapsed.total_seconds())


def format_duration(seconds: int) -> str:
    """
    Format seconds into HH:MM:SS format.
    
    Args:
        seconds: Total seconds
        
    Returns:
        Formatted duration string
    """
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def get_time_remaining(
    start_time: datetime,
    duration_minutes: int,
) -> Tuple[int, bool]:
    """
    Calculate time remaining for an exam.
    
    Args:
        start_time: Exam start time
        duration_minutes: Total exam duration in minutes
        
    Returns:
        Tuple of (remaining_seconds, is_time_up)
    """
    elapsed = get_elapsed_seconds(start_time)
    total_seconds = duration_minutes * 60
    remaining = total_seconds - elapsed

    if remaining <= 0:
        return 0, True

    return remaining, False


def is_duration_exceeded(
    start_time: datetime,
    max_seconds: float,
    current_time: datetime = None,
) -> bool:
    """
    Check if a duration has been exceeded.
    
    Args:
        start_time: Start datetime
        max_seconds: Maximum allowed seconds
        current_time: Current time (defaults to now)
        
    Returns:
        True if duration exceeded, False otherwise
    """
    if current_time is None:
        current_time = datetime.utcnow()

    elapsed = (current_time - start_time).total_seconds()
    return elapsed >= max_seconds
