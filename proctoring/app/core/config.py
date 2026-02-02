import os
from typing import Literal
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    SERVICE_NAME: str = os.getenv("SERVICE_NAME")
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", 8000))
    ENV: Literal["development", "staging", "production"] = os.getenv("ENV")

    JWT_SECRET: str = os.getenv("JWT_SECRET")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")

    MONGO_URI: str = os.getenv("MONGO_URI")
    MONGO_DB: str = os.getenv("MONGO_DB", "neuroiq_exam")

    FRAME_INTERVAL_SECONDS: float = float(os.getenv("FRAME_INTERVAL_SECONDS", 2.0))
    MAX_NO_FACE_SECONDS: float = float(os.getenv("MAX_NO_FACE_SECONDS", 3.0))
    MAX_LOOKING_AWAY_SECONDS: float = float(os.getenv("MAX_LOOKING_AWAY_SECONDS", 3.0))
    MAX_WARNINGS: int = int(os.getenv("MAX_WARNINGS", 3))

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
