"""
Eye tracking and gaze direction detection
"""
import mediapipe as mp
import numpy as np
from typing import Tuple, Optional

from app.core.logging import logger


class EyeTracker:
    """Eye tracking and gaze direction using MediaPipe Face Mesh"""

    # Face Mesh landmark indices
    LEFT_EYE = [362, 385, 387, 263, 373, 380]
    RIGHT_EYE = [33, 160, 158, 133, 153, 144]

    # Gaze direction landmarks
    LEFT_IRIS = [468]
    RIGHT_IRIS = [473]

    def __init__(self):
        """Initialize MediaPipe Face Mesh"""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )

    def detect_eyes_looking_away(
        self,
        image: np.ndarray,
        threshold: float = 0.3,
    ) -> Tuple[bool, Optional[dict]]:
        """
        Detect if eyes are looking away from camera.
        
        Args:
            image: OpenCV image array (BGR)
            threshold: Threshold for gaze direction (0-1)
            
        Returns:
            Tuple of (is_looking_away, gaze_data)
            gaze_data contains:
                'left_iris_x': normalized iris x position,
                'right_iris_x': normalized iris x position,
                'horizontal_gaze': -1 (left), 0 (center), 1 (right)
        """
        rgb_image = image[:, :, ::-1]
        results = self.face_mesh.process(rgb_image)

        if not results.multi_face_landmarks or len(results.multi_face_landmarks) == 0:
            return True, None  # No face = looking away

        landmarks = results.multi_face_landmarks[0].landmark
        h, w, _ = image.shape

        # Get iris positions
        left_iris = landmarks[self.LEFT_IRIS[0]]
        right_iris = landmarks[self.RIGHT_IRIS[0]]

        # Normalize iris positions relative to eye regions
        left_eye_points = [landmarks[i] for i in self.LEFT_EYE]
        right_eye_points = [landmarks[i] for i in self.RIGHT_EYE]

        left_eye_center_x = np.mean([p.x for p in left_eye_points])
        right_eye_center_x = np.mean([p.x for p in right_eye_points])

        # Calculate horizontal gaze direction
        left_gaze = left_iris.x - left_eye_center_x
        right_gaze = right_iris.x - right_eye_center_x

        # Determine if looking away
        looking_away = abs(left_gaze) > threshold or abs(right_gaze) > threshold

        gaze_data = {
            "left_iris_x": left_iris.x,
            "right_iris_x": right_iris.x,
            "left_gaze_offset": left_gaze,
            "right_gaze_offset": right_gaze,
            "horizontal_gaze": (
                -1 if (left_gaze < -threshold or right_gaze < -threshold) else
                1 if (left_gaze > threshold or right_gaze > threshold) else
                0
            ),
        }

        return looking_away, gaze_data

    def close(self):
        """Close tracker resources"""
        if self.face_mesh:
            self.face_mesh.close()
