from typing import Optional, List
from datetime import datetime
import uuid

from app.db.mongo import MongoDB
from app.models.exam import (
    ExamSession,
    Violation,
    ExamStatusEnum,
    ViolationTypeEnum,
    ViolationSeverityEnum,
)
from app.core.logging import logger


class ExamSessionRepository:
    @staticmethod
    def collection():
        return MongoDB.db()["exam_sessions"]

    @classmethod
    async def create_session(
        cls,
        student_id: str,
        exam_id: str,
    ) -> ExamSession:
        session_id = str(uuid.uuid4())

        data = {
            "_id": session_id,
            "student_id": student_id,
            "exam_id": exam_id,
            "status": ExamStatusEnum.ACTIVE,
            "start_time": datetime.utcnow(),
            "end_time": None,
            "warnings": 0,
            "violation_count": 0,
            "identity_verified": False,
            "identity_snapshot_base64": None,
        }

        await cls.collection().insert_one(data)
        logger.info(f"Exam session created: {session_id}")

        return ExamSession(**data)

    @classmethod
    async def get_session(cls, session_id: str) -> Optional[ExamSession]:
        doc = await cls.collection().find_one({"_id": session_id})
        return ExamSession(**doc) if doc else None

    @classmethod
    async def update_status(
        cls,
        session_id: str,
        status: ExamStatusEnum,
        end_time: Optional[datetime] = None,
    ) -> bool:
        update = {"status": status}
        if end_time:
            update["end_time"] = end_time

        result = await cls.collection().update_one(
            {"_id": session_id},
            {"$set": update},
        )
        return result.modified_count > 0

    # ✅ Alias for service layer
    @classmethod
    async def update_status(
        cls,
        session_id: str,
        status: ExamStatusEnum,
        end_time: Optional[datetime] = None,
    ) -> bool:
        return await cls.update_status(session_id, status, end_time)

    @classmethod
    async def increment_warnings(cls, session_id: str) -> int:
        doc = await cls.collection().find_one_and_update(
            {"_id": session_id},
            {"$inc": {"warnings": 1}},
            return_document=True,
        )
        return doc["warnings"] if doc else 0

    @classmethod
    async def increment_violations(cls, session_id: str) -> int:
        doc = await cls.collection().find_one_and_update(
            {"_id": session_id},
            {"$inc": {"violation_count": 1}},
            return_document=True,
        )
        return doc["violation_count"] if doc else 0

    @classmethod
    async def verify_identity(
        cls,
        session_id: str,
        snapshot_base64: str,
    ) -> bool:
        result = await cls.collection().update_one(
            {"_id": session_id},
            {
                "$set": {
                    "identity_verified": True,
                    "identity_snapshot_base64": snapshot_base64,
                }
            },
        )
        return result.modified_count > 0

    # ✅ Alias for proctoring service
    @classmethod
    async def set_identity_verified(
        cls,
        session_id: str,
        snapshot_base64: str,
    ) -> bool:
        return await cls.verify_identity(session_id, snapshot_base64)


class ViolationRepository:
    @staticmethod
    def collection():
        return MongoDB.db()["violations"]

    @classmethod
    async def create(
        cls,
        session_id: str,
        student_id: str,
        violation_type: ViolationTypeEnum,
        severity: ViolationSeverityEnum,
        duration_seconds: Optional[float] = None,
        metadata: Optional[dict] = None,
    ) -> Violation:
        violation_id = str(uuid.uuid4())

        data = {
            "_id": violation_id,
            "session_id": session_id,
            "student_id": student_id,
            "violation_type": violation_type,
            "severity": severity,
            "timestamp": datetime.utcnow(),
            "duration_seconds": duration_seconds,
            "metadata": metadata or {},
        }

        await cls.collection().insert_one(data)
        logger.info(f"Violation created: {violation_id}")

        return Violation(**data)

    # ✅ Alias for proctoring service
    @classmethod
    async def create_violation(
        cls,
        session_id: str,
        student_id: str,
        violation_type: ViolationTypeEnum,
        severity: ViolationSeverityEnum,
        duration_seconds: Optional[float] = None,
        metadata: Optional[dict] = None,
    ) -> Violation:
        return await cls.create(
            session_id=session_id,
            student_id=student_id,
            violation_type=violation_type,
            severity=severity,
            duration_seconds=duration_seconds,
            metadata=metadata,
        )

    @classmethod
    async def for_session(cls, session_id: str) -> List[Violation]:
        docs = await cls.collection().find(
            {"session_id": session_id}
        ).to_list(None)

        return [Violation(**d) for d in docs]

    
    @classmethod
    async def get_violations(cls, session_id: str) -> List[Violation]:
        return await cls.for_session(session_id)

    @classmethod
    async def count_critical(cls, session_id: str) -> int:
        return await cls.collection().count_documents(
            {
                "session_id": session_id,
                "severity": ViolationSeverityEnum.CRITICAL,
            }
        )

    @classmethod
    async def count_critical_violations(cls, session_id: str) -> int:
        return await cls.count_critical(session_id)
