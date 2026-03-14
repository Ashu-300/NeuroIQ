"""
Socket.IO client for streaming proctoring data to backend namespace /proctor
"""

import os
import logging
import socketio
from datetime import datetime, timezone

logger = logging.getLogger(__name__)



# Socket client and last error tracker
_sio = socketio.Client(reconnection=True)
_last_error: str | None = None


@_sio.event(namespace="/proctor")
def connect():
    logger.info("Connected to proctoring backend namespace /proctor")


@_sio.event(namespace="/proctor")
def disconnect():
    logger.info("Disconnected from proctoring backend")

@_sio.event
def connect_error(data):
    global _last_error
    _last_error = str(data)
    logger.error("Connection error: %s", data)


@_sio.on("proctoring:ack", namespace="/proctor")
def on_ack(data):
    logger.info("Server ACK received: %s", data)


def connect_client():
    try:
        socket_url = os.getenv("PROCTOR_BACKEND_SOCKETIO")

        logger.info("Connecting to %s", socket_url)

        _sio.connect(
            socket_url,
            namespaces=["/proctor"],
            socketio_path="ws/socket.io",
            wait=True,
            wait_timeout=10,
            transports=["websocket"]
        )

        return _sio.connected

    except Exception as e:
        global _last_error
        _last_error = str(e)
        logger.error("Connection failed: %s", e)
        return False


def send_proctor_data(payload: dict):

    if not _sio.connected:
        logger.warning("Socket not connected")
        return False

    try:
        payload["timestamp"] = datetime.now(timezone.utc).isoformat()

        def ack(response):
            logger.info("ACK from server: %s", response)

        _sio.emit("proctoring:data", payload, namespace="/proctor", callback=ack)

        return True

    except Exception as e:
        logger.error("Send failed: %s", e)
        return False


def close():
    if _sio.connected:
        _sio.disconnect()


def is_connected() -> bool:
    """Return whether the Socket.IO client is currently connected."""
    return _sio.connected


def get_connection_info() -> dict:
    return {
        "url": os.getenv("PROCTOR_BACKEND_SOCKETIO"),
        "last_error": _last_error,
    }