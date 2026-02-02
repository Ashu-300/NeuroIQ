from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.logging import logger


class MongoDB:
    _client: Optional[AsyncIOMotorClient] = None
    _db = None

    @classmethod
    async def connect(cls) -> None:
        if cls._client is not None:
            return

        try:
            cls._client = AsyncIOMotorClient(settings.MONGO_URI)
            cls._db = cls._client[settings.MONGO_DB]

            await cls._client.admin.command("ping")
            logger.info(f"MongoDB connected: {settings.MONGO_DB}")

        except Exception as exc:
            logger.error(f"MongoDB connection failed: {exc}")
            cls._client = None
            cls._db = None
            raise

    @classmethod
    async def disconnect(cls) -> None:
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("MongoDB disconnected")

    @classmethod
    def db(cls):
        if cls._db is None:
            raise RuntimeError("MongoDB not connected")
        return cls._db

    @classmethod
    def client(cls):
        if cls._client is None:
            raise RuntimeError("MongoDB not connected")
        return cls._client

    # Backwards-compatible aliases
    @classmethod
    def get_db(cls):
        return cls.db()

    @classmethod
    def get_client(cls):
        return cls.client()
