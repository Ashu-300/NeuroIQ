import os
from jose import jwt, JWTError

JWT_ACCESS_SECRET = os.getenv("JWT_ACCESS_SECRET", "authsecret123")
ALGORITHM = "HS256"


def verify_token(token: str):
    """
    Verify JWT token and return decoded claims.
    """
    try:
        payload = jwt.decode(token, JWT_ACCESS_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None