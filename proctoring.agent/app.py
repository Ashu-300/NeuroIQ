import logging

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.run import start_proctoring, stop_proctoring, is_proctoring_active
from src.session import set_session, clear_session, get_session
from src import socketio_client
from jwtutil import verify_token

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="NeuroIQ Proctoring Agent")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local agent
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartRequest(BaseModel):
    session_id: str
    exam_id: str


@app.on_event("startup")
async def startup_event():
    """Called when the FastAPI application starts."""
    logger.info("Proctoring agent started")


@app.on_event("shutdown")
async def shutdown_event():
    """Called when the FastAPI application shuts down."""
    logger.info("Proctoring agent shutting down")
    stop_proctoring()
    socketio_client.close()


@app.post("/start-proctoring")
def start(request: StartRequest, authorization: str = Header(...)):
    """
    Start the proctoring session.
    """

    # Extract token from "Bearer <token>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ")[1]

    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    student_id = payload.get("ID")

    if not student_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    if is_proctoring_active():
        logger.warning("Proctoring already running")
        return {"status": "Proctoring already running", "agent_running": True}

    # Store session information
    set_session(
        session_id=request.session_id,
        student_id=student_id,
        exam_id=request.exam_id
    )

    logger.info(f"Session started: session_id={request.session_id}, student_id={student_id}, exam_id={request.exam_id}")

    # Establish Socket.IO connection
    connected = socketio_client.connect_client()

    if connected:
        logger.info("Socket.IO connection established")
    else:
        logger.warning("Socket.IO connection pending - proctoring will start anyway")

    start_proctoring()

    return {
        "status": "Proctoring started",
        "agent_running": is_proctoring_active(),
        "socketio_connected": socketio_client.is_connected(),
    }


@app.post("/stop-proctoring")
def stop():
    """
    Stop the proctoring session.
    
    Stops the proctoring threads, closes WebSocket connection,
    and clears session information.
    """
    logger.info("Stopping proctoring...")
    
    # Stop proctoring threads
    stop_proctoring()
    
    # Close WebSocket connection
    socketio_client.close()
    logger.info("Socket.IO connection closed")
    
    # Clear session information
    clear_session()
    
    logger.info("Proctoring stopped")
    return {"status": "Proctoring stopped"}


@app.get("/status")
def status():
    """
    Check if the proctoring agent is running.
    
    Returns the current status of the proctoring session.
    """
    is_running = is_proctoring_active()
    ws_connected = socketio_client.is_connected()
    session = get_session()
    ws_info = socketio_client.get_connection_info()
    
    return {
        "agent_running": is_running,
        "socketio_connected": ws_connected,
        "session_id": session.session_id if session else None,
        "socketio_url": ws_info.get("url"),
        "socketio_last_error": ws_info.get("last_error"),
    }

@app.get("/")
def root():
    """Root endpoint to check if the agent is running."""
    return {"message": "NeuroIQ Proctoring Agent is running"}