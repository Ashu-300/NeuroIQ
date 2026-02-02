"""
Proctoring service for violation detection and handling
"""
from datetime import datetime
from typing import Optional, Tuple
import numpy as np

from app.db.repositories import ExamSessionRepository, ViolationRepository
from app.models.exam import ViolationTypeEnum, ViolationSeverityEnum
from app.proctoring.face_detection import FaceDetector
from app.proctoring.eye_tracking import EyeTracker
from app.proctoring.head_pose import HeadPoseEstimator
from app.proctoring.rules import ViolationRulesEngine
from app.utils.image import base64_to_image
from app.core.logging import logger


class ProctoringService:
    """Service for AI-based exam proctoring"""

    def __init__(self):
        """Initialize proctoring components"""
        self.face_detector = FaceDetector()
        self.eye_tracker = EyeTracker()
        self.head_pose_estimator = HeadPoseEstimator()
        self.rules_engine = ViolationRulesEngine()

    async def verify_initial_identity(
        self,
        session_id: str,
        frame_base64: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify student identity at exam start.
        
        Args:
            session_id: Exam session ID
            frame_base64: Base64 encoded webcam frame
            
        Returns:
            Tuple of (identity_verified, error_message)
        """
        image = base64_to_image(frame_base64)
        if image is None:
            return False, "Failed to decode frame"

        faces, face_count = self.face_detector.detect_faces(image)

        if face_count == 0:
            return False, "No face detected"

        if face_count > 1:
            return False, "Multiple faces detected"

        # Store identity snapshot
        await ExamSessionRepository.verify_identity(session_id, frame_base64)

        logger.info(
            f"Identity verified for session {session_id}",
            extra={"face_count": face_count},
        )

        return True, None

    async def process_proctoring_frame(
        self,
        session_id: str,
        frame_base64: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Process a frame from the webcam and check for violations.
        
        Args:
            session_id: Exam session ID
            frame_base64: Base64 encoded frame
            
        Returns:
            Tuple of (should_auto_submit, violation_message)
        """
        image = base64_to_image(frame_base64)
        if image is None:
            logger.warning(f"Failed to decode frame for session {session_id}")
            return False, None

        current_time = datetime.utcnow()
        violations_detected = []

        # Face detection check
        faces, face_count = self.face_detector.detect_faces(image)

        if face_count == 0:
            violation = self.rules_engine.check_violation(
                ViolationTypeEnum.NO_FACE,
                condition=True,
                current_time=current_time,
            )
            if violation:
                violations_detected.append(violation)
        elif face_count > 1:
            violation = self.rules_engine.check_violation(
                ViolationTypeEnum.MULTIPLE_FACES,
                condition=True,
                current_time=current_time,
            )
            if violation:
                violations_detected.append(violation)
        else:
            # Single face detected, clear no-face violations
            self.rules_engine.check_violation(
                ViolationTypeEnum.NO_FACE,
                condition=False,
                current_time=current_time,
            )
            self.rules_engine.check_violation(
                ViolationTypeEnum.MULTIPLE_FACES,
                condition=False,
                current_time=current_time,
            )

            # Check eye tracking
            looking_away, gaze_data = self.eye_tracker.detect_eyes_looking_away(image)
            violation = self.rules_engine.check_violation(
                ViolationTypeEnum.LOOKING_AWAY,
                condition=looking_away,
                current_time=current_time,
            )
            if violation:
                violations_detected.append(violation)

            # Check head pose
            head_turned, pose_data = self.head_pose_estimator.estimate_head_pose(image)
            violation = self.rules_engine.check_violation(
                ViolationTypeEnum.HEAD_TURN,
                condition=head_turned,
                current_time=current_time,
            )
            if violation:
                violations_detected.append(violation)

        # Persist violations
        session = await ExamSessionRepository.get_session(session_id)
        if session:
            for violation_data in violations_detected:
                await ViolationRepository.create_violation(
                    session_id=session_id,
                    student_id=session.student_id,
                    violation_type=violation_data["violation_type"],
                    severity=violation_data["severity"],
                    duration_seconds=violation_data.get("duration_seconds"),
                    metadata={
                        "gaze_data": gaze_data if 'gaze_data' in locals() else None,
                        "pose_data": pose_data if 'pose_data' in locals() else None,
                    },
                )

                # Increment warning count
                await ExamSessionRepository.increment_warnings(session_id)

            # Check if should auto-submit
            if self.rules_engine.should_auto_submit():
                return True, f"Auto-submit: {self.rules_engine.warning_count} warnings exceeded"

        return False, None

    def close(self):
        """Close all detector resources"""
        self.face_detector.close()
        self.eye_tracker.close()
        self.head_pose_estimator.close()
        logger.info("Proctoring service closed")
