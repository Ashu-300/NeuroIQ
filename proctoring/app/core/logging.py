"""
Structured logging configuration
"""
import logging
import json
from datetime import datetime
from typing import Any, Dict

from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": settings.SERVICE_NAME,
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id

        return json.dumps(log_data)


def configure_logging():
    """Configure structured JSON logging for the application"""
    logger = logging.getLogger()
    logger.setLevel(settings.LOG_LEVEL.upper())

    # Console handler with JSON formatter
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(JSONFormatter())

    logger.addHandler(console_handler)

    # Suppress verbose logs from libraries
    logging.getLogger("pymongo").setLevel(logging.WARNING)
    logging.getLogger("motor").setLevel(logging.WARNING)

    return logger


# Initialize logger
logger = configure_logging()
