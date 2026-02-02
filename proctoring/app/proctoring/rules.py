"""
Violation rules engine for proctoring policy enforcement
"""
from dataclasses import dataclass
from typing import Dict, Optional
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.logging import logger
from app.models.exam import ViolationTypeEnum, ViolationSeverityEnum


@dataclass
class ViolationPolicy:
    """Policy for a violation type"""
    max_duration_seconds: Optional[float]  # None for instant violations
    severity: ViolationSeverityEnum
    auto_submit_on_critical: bool = False


class ViolationRulesEngine:
    """Enforces violation rules and tracks violations"""

    VIOLATION_POLICIES: Dict[ViolationTypeEnum, ViolationPolicy] = {
        ViolationTypeEnum.NO_FACE: ViolationPolicy(
            max_duration_seconds=settings.MAX_NO_FACE_SECONDS,
            severity=ViolationSeverityEnum.HIGH,
            auto_submit_on_critical=True,
        ),
        ViolationTypeEnum.MULTIPLE_FACES: ViolationPolicy(
            max_duration_seconds=None,  # Instant violation
            severity=ViolationSeverityEnum.CRITICAL,
            auto_submit_on_critical=True,
        ),
        ViolationTypeEnum.LOOKING_AWAY: ViolationPolicy(
            max_duration_seconds=settings.MAX_LOOKING_AWAY_SECONDS,
            severity=ViolationSeverityEnum.MEDIUM,
        ),
        ViolationTypeEnum.HEAD_TURN: ViolationPolicy(
            max_duration_seconds=3.0,  # 3 seconds tolerance
            severity=ViolationSeverityEnum.MEDIUM,
        ),
    }

    def __init__(self):
        """Initialize violation tracker"""
        # Track ongoing violations: {violation_type: start_datetime}
        self.ongoing_violations: Dict[ViolationTypeEnum, datetime] = {}
        self.violation_count: int = 0
        self.warning_count: int = 0

    def check_violation(
        self,
        violation_type: ViolationTypeEnum,
        condition: bool,
        current_time: datetime = None,
    ) -> Optional[Dict]:
        """
        Check if a violation should be triggered based on condition and duration.
        
        Args:
            violation_type: Type of violation
            condition: Current condition (True = violation condition present)
            current_time: Current datetime
            
        Returns:
            Dict with violation details if triggered, None otherwise
        """
        if current_time is None:
            current_time = datetime.utcnow()

        policy = self.VIOLATION_POLICIES[violation_type]

        if not condition:
            # Condition no longer present, clear from tracking
            if violation_type in self.ongoing_violations:
                del self.ongoing_violations[violation_type]
            return None

        # Condition is present
        if violation_type not in self.ongoing_violations:
            # First time we're seeing this violation
            self.ongoing_violations[violation_type] = current_time

            # If instant violation (no max_duration), trigger immediately
            if policy.max_duration_seconds is None:
                return self._create_violation(violation_type, policy, 0)

            return None

        # We've been tracking this violation
        start_time = self.ongoing_violations[violation_type]
        duration = (current_time - start_time).total_seconds()

        if duration >= policy.max_duration_seconds:
            # Duration threshold exceeded, trigger violation
            return self._create_violation(violation_type, policy, duration)

        return None

    def _create_violation(
        self,
        violation_type: ViolationTypeEnum,
        policy: ViolationPolicy,
        duration_seconds: float,
    ) -> Dict:
        """Create violation record"""
        self.violation_count += 1

        if policy.severity != ViolationSeverityEnum.CRITICAL:
            self.warning_count += 1

        violation = {
            "violation_type": violation_type,
            "severity": policy.severity,
            "duration_seconds": duration_seconds,
            "timestamp": datetime.utcnow(),
        }

        logger.info(
            f"Violation triggered: {violation_type}",
            extra={
                "severity": policy.severity,
                "duration": duration_seconds,
            },
        )

        return violation

    def should_auto_submit(self) -> bool:
        """
        Check if exam should be auto-submitted based on violations.
        
        Returns:
            True if auto-submit threshold exceeded
        """
        # Auto-submit if critical violation occurred
        if self.violation_count > 0:
            # Check if any recent violation was critical
            # (In practice, this would be tracked more carefully)
            pass

        # Auto-submit if warning count exceeded
        if self.warning_count >= settings.MAX_WARNINGS:
            logger.warning(
                f"Auto-submit triggered: {self.warning_count} warnings exceed threshold"
            )
            return True

        return False

    def get_violation_summary(self) -> Dict:
        """Get current violation summary"""
        return {
            "total_violations": self.violation_count,
            "warnings": self.warning_count,
            "ongoing_violations": list(self.ongoing_violations.keys()),
        }

    def reset(self):
        """Reset violation tracking for new session"""
        self.ongoing_violations.clear()
        self.violation_count = 0
        self.warning_count = 0
