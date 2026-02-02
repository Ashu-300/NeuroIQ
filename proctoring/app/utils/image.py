"""
Image processing utilities
"""
import base64
import numpy as np
import cv2
from typing import Optional, Tuple
from io import BytesIO

from app.core.logging import logger


def base64_to_image(image_base64: str) -> Optional[np.ndarray]:
    """
    Convert base64 encoded image string to OpenCV image.
    
    Args:
        image_base64: Base64 encoded image string
        
    Returns:
        OpenCV image array (BGR) or None if decode fails
    """
    try:
        # Remove data URL prefix if present
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        image_bytes = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            logger.warning("Failed to decode image from base64")
            return None

        return image

    except Exception as e:
        logger.error(f"Error converting base64 to image: {str(e)}")
        return None


def image_to_base64(image: np.ndarray, quality: int = 80) -> Optional[str]:
    """
    Convert OpenCV image to base64 encoded string.
    
    Args:
        image: OpenCV image array (BGR)
        quality: JPEG quality (0-100)
        
    Returns:
        Base64 encoded string or None if encoding fails
    """
    try:
        _, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, quality])
        image_base64 = base64.b64encode(buffer).decode("utf-8")
        return image_base64

    except Exception as e:
        logger.error(f"Error converting image to base64: {str(e)}")
        return None


def get_image_dimensions(image: np.ndarray) -> Tuple[int, int]:
    """Get image width and height"""
    height, width = image.shape[:2]
    return width, height


def resize_image(image: np.ndarray, max_width: int = 640) -> np.ndarray:
    """
    Resize image if it exceeds max width while maintaining aspect ratio.
    
    Args:
        image: OpenCV image
        max_width: Maximum width in pixels
        
    Returns:
        Resized image or original if already smaller
    """
    height, width = image.shape[:2]

    if width <= max_width:
        return image

    scale = max_width / width
    new_height = int(height * scale)
    return cv2.resize(image, (max_width, new_height))


def draw_detection_box(
    image: np.ndarray,
    x: int,
    y: int,
    w: int,
    h: int,
    label: str = "",
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2,
) -> np.ndarray:
    """
    Draw rectangle on image for detection visualization.
    
    Args:
        image: OpenCV image
        x, y: Top-left corner coordinates
        w, h: Width and height
        label: Optional text label
        color: BGR color tuple
        thickness: Line thickness
        
    Returns:
        Modified image
    """
    cv2.rectangle(image, (x, y), (x + w, y + h), color, thickness)

    if label:
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(image, label, (x, y - 10), font, 0.5, color, 2)

    return image
