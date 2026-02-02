"""
JWT security and authentication utilities
Compatible with Go auth service (HS256)
"""

import jwt
from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

security = HTTPBearer()


class AuthContext:
    """Authenticated user context"""

    def __init__(self, user_id: str, role: str, email: Optional[str] = None):
        self.user_id = user_id
        self.role = role
        self.email = email


def verify_jwt_token(credentials: HTTPAuthorizationCredentials) -> AuthContext:
    """
    Verify JWT token and extract user context.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,              
            algorithms=[settings.JWT_ALGORITHM],  
        )

        # ✅ Match Go claim names
        user_id = payload.get("ID")
        role = payload.get("Role")
        email = payload.get("Email")


        if not user_id or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing required claims",
            )

        return AuthContext(
            user_id=user_id,
            email=email,
            role=role,
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthContext:
    """FastAPI dependency for protected routes"""
    return verify_jwt_token(credentials)
