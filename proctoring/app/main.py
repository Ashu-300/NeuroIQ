"""
FastAPI application factory and setup
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.db.mongo import MongoDB
from app.routes import exam_routes, proctor_routes, submission_routes
from app.websocket.proctoring_ws import handle_proctoring_websocket


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""

    app = FastAPI(
        title="NeuroIQ Proctoring Service",
        description="Online examination with AI-based proctoring",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Startup event
    @app.on_event("startup")
    async def startup():
        """Initialize application on startup"""
        logger.info(
            f"Starting {settings.SERVICE_NAME} service on port {settings.SERVICE_PORT}"
        )

        # Connect to MongoDB
        await MongoDB.connect()

        # Create indexes
        db = MongoDB.get_db()
        await db["exam_sessions"].create_index("student_id")
        await db["exam_sessions"].create_index("exam_id")
        await db["violations"].create_index("session_id")
        await db["violations"].create_index(("session_id", "timestamp"))

        logger.info("Database indexes created successfully")

    # Shutdown event
    @app.on_event("shutdown")
    async def shutdown():
        """Cleanup on application shutdown"""
        logger.info(f"Shutting down {settings.SERVICE_NAME} service")
        await MongoDB.disconnect()

    # Include routers
    app.include_router(exam_routes.router)
    app.include_router(proctor_routes.router)
    app.include_router(submission_routes.router)

    # WebSocket route
    @app.websocket("/ws/proctor/{session_id}")
    async def websocket_endpoint(websocket, session_id: str):
        """
        WebSocket endpoint for live proctoring.
        
        Path:
            session_id: Exam session ID
        """
        await handle_proctoring_websocket(websocket, session_id)

    # Health check
    @app.get("/health", tags=["health"])
    async def health():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "service": settings.SERVICE_NAME,
            "version": "1.0.0",
        }

    # Root endpoint
    @app.get("/", tags=["info"])
    async def root():
        """Service information endpoint"""
        return {
            "service": settings.SERVICE_NAME,
            "description": "Online examination with AI-based proctoring",
            "version": "1.0.0",
            "endpoints": {
                "health": "/health",
                "docs": "/docs",
                "exam": "/exam",
                "proctor": "/proctor",
                "submission": "/submission",
                "websocket_proctor": "ws://localhost:{}/ws/proctor/{{session_id}}".format(
                    settings.SERVICE_PORT
                ),
            },
        }

    return app
