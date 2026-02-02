"""
Face detection using MediaPipe BlazeFace
"""
import mediapipe as mp
import numpy as np
from typing import List, Tuple, Optional

from app.core.logging import logger


class FaceDetector:
    """Face detection using MediaPipe"""

    def __init__(self):
        """Initialize MediaPipe face detection"""
        self.mp_face_detection = mp.solutions.face_detection
        self.detector = self.mp_face_detection.FaceDetection(
            model_selection=0,  # 0 for short-range, 1 for full-range
            min_detection_confidence=0.7,
        )

    def detect_faces(self, image: np.ndarray) -> Tuple[List[dict], int]:
        """
        Detect faces in an image.
        
        Args:
            image: OpenCV image array (BGR)
            
        Returns:
            Tuple of (faces_list, face_count)
            Each face contains: {
                'x': normalized x,
                'y': normalized y,
                'w': normalized width,
                'h': normalized height,
                'confidence': detection confidence
            }
        """
        # Convert BGR to RGB
        rgb_image = image[:, :, ::-1]

        results = self.detector.process(rgb_image)
        faces = []

        if results.detections:
            h, w, _ = image.shape

            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box

                # Convert normalized to pixel coordinates
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)

                face = {
                    "x": x,
                    "y": y,
                    "w": width,
                    "h": height,
                    "confidence": detection.score[0],
                }
                faces.append(face)

        return faces, len(faces)

    def close(self):
        """Close detector resources"""
        if self.detector:
            self.detector.close()
