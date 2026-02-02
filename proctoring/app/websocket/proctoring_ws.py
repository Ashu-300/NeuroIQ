"""
WebSocket handler for live webcam proctoring
"""
import json
from fastapi import WebSocket, WebSocketDisconnect
import asyncio

from app.services.proctoring_service import ProctoringService
from app.services.exam_service import ExamService
from app.core.logging import logger


class ProctorConnectionManager:
    """Manage WebSocket connections for proctoring"""

    def __init__(self):
        """Initialize connection manager"""
        self.active_connections: dict = {}  # session_id -> websocket
        self.proctoring_service = ProctoringService()

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"Proctoring WebSocket connected: {session_id}")

    async def disconnect(self, session_id: str):
        """Remove WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"Proctoring WebSocket disconnected: {session_id}")

    async def handle_proctoring_frame(
        self,
        websocket: WebSocket,
        session_id: str,
        payload: dict,
    ):
        """
        Handle incoming webcam frame.
        
        Args:
            websocket: WebSocket connection
            session_id: Exam session ID
            payload: JSON payload with frame data
        """
        try:
            frame_base64 = payload.get("frame")
            timestamp = payload.get("timestamp")

            if not frame_base64:
                await websocket.send_json({
                    "status": "error",
                    "message": "Missing frame data",
                })
                return

            # Process frame for violations
            should_auto_submit, violation_msg = await self.proctoring_service.process_proctoring_frame(
                session_id,
                frame_base64,
            )

            # Send response
            response = {
                "status": "ok",
                "processed": True,
                "auto_submit": should_auto_submit,
                "timestamp": timestamp,
            }

            if violation_msg:
                response["violation_message"] = violation_msg

            await websocket.send_json(response)

            # If auto-submit triggered, submit exam
            if should_auto_submit:
                await ExamService.auto_submit_exam(
                    session_id,
                    reason="proctoring_violation",
                )

                await websocket.send_json({
                    "status": "auto_submit",
                    "message": "Exam auto-submitted due to violations",
                    "reason": "Max warnings exceeded",
                })

                # Close connection
                await websocket.close(code=1000, reason="Exam auto-submitted")

        except Exception as e:
            logger.error(f"Error processing proctoring frame: {str(e)}")
            await websocket.send_json({
                "status": "error",
                "message": f"Frame processing error: {str(e)}",
            })


# Global manager
proctor_manager = ProctorConnectionManager()


async def handle_proctoring_websocket(
    websocket: WebSocket,
    session_id: str,
):
    """
    WebSocket endpoint for live proctoring.
    
    Endpoint: /ws/proctor/{session_id}
    
    Expected payload:
    {
        "frame": "base64_encoded_image",
        "timestamp": unix_timestamp
    }
    """
    # Verify session exists
    session = await ExamService.get_exam_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    await proctor_manager.connect(websocket, session_id)

    try:
        while True:
            # Receive frame
            data = await websocket.receive_text()
            payload = json.loads(data)

            # Process frame
            await proctor_manager.handle_proctoring_frame(
                websocket,
                session_id,
                payload,
            )

    except WebSocketDisconnect:
        await proctor_manager.disconnect(session_id)
        logger.info(f"WebSocket disconnected for session {session_id}")

    except json.JSONDecodeError:
        await websocket.close(code=4000, reason="Invalid JSON payload")
        await proctor_manager.disconnect(session_id)

    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {str(e)}")
        await websocket.close(code=4000, reason=str(e))
        await proctor_manager.disconnect(session_id)
