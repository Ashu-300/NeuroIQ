"""
Head pose estimation and rotation detection
"""
import mediapipe as mp
import numpy as np
from typing import Tuple, Optional

from app.core.logging import logger


class HeadPoseEstimator:
    """Head pose estimation using MediaPipe Face Mesh"""

    # Key face mesh landmarks for head pose
    FACE_LANDMARKS_INDICES = [33, 133, 263, 362, 263, 362, 0, 10, 152, 155, 193, 197]

    def __init__(self):
        """Initialize MediaPipe Face Mesh for head pose"""
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )

    def estimate_head_pose(
        self,
        image: np.ndarray,
        rotation_threshold: float = 20.0,
    ) -> Tuple[bool, Optional[dict]]:
        """
        Estimate head pose and detect excessive rotation.
        
        Args:
            image: OpenCV image array (BGR)
            rotation_threshold: Threshold in degrees for detecting head turn
            
        Returns:
            Tuple of (is_head_turned, pose_data)
            pose_data contains:
                'pitch': rotation around x-axis (looking up/down)
                'yaw': rotation around y-axis (looking left/right)
                'roll': rotation around z-axis (tilting)
        """
        rgb_image = image[:, :, ::-1]
        results = self.face_mesh.process(rgb_image)

        if not results.multi_face_landmarks or len(results.multi_face_landmarks) == 0:
            return True, None  # No face = head turned away

        landmarks = results.multi_face_landmarks[0].landmark
        h, w, _ = image.shape

        # Use key points for pose estimation
        # Nose
        nose = np.array([landmarks[1].x * w, landmarks[1].y * h])

        # Left and right eye
        left_eye = np.array([landmarks[33].x * w, landmarks[33].y * h])
        right_eye = np.array([landmarks[263].x * w, landmarks[263].y * h])

        # Mouth corners
        left_mouth = np.array([landmarks[61].x * w, landmarks[61].y * h])
        right_mouth = np.array([landmarks[291].x * w, landmarks[291].y * h])

        # Chin
        chin = np.array([landmarks[152].x * w, landmarks[152].y * h])

        # Calculate angles
        # Yaw (left-right rotation)
        eye_distance = right_eye[0] - left_eye[0]
        nose_offset = nose[0] - (left_eye[0] + right_eye[0]) / 2
        yaw = np.degrees(np.arctan2(nose_offset, eye_distance))

        # Pitch (up-down rotation)
        vertical_distance = chin[1] - (left_eye[1] + right_eye[1]) / 2
        nose_vertical_offset = nose[1] - (left_eye[1] + right_eye[1]) / 2
        pitch = np.degrees(np.arctan2(nose_vertical_offset, vertical_distance))

        # Roll (tilting)
        eye_angle = np.degrees(np.arctan2(right_eye[1] - left_eye[1], right_eye[0] - left_eye[0]))
        roll = eye_angle

        # Check if head is turned
        is_head_turned = (abs(yaw) > rotation_threshold or
                         abs(pitch) > rotation_threshold)

        pose_data = {
            "yaw": float(yaw),
            "pitch": float(pitch),
            "roll": float(roll),
        }

        return is_head_turned, pose_data

    def close(self):
        """Close estimator resources"""
        if self.face_mesh:
            self.face_mesh.close()
