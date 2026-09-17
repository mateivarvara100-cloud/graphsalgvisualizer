import os
import urllib.request
import urllib.parse
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
JWT_SECRET = os.getenv("JWT_SECRET", "").strip()

if is_prod:
    if not JWT_SECRET:
        raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET environment variable must be set in production!")
    if len(JWT_SECRET) < 32:
        raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long in production.")
elif not JWT_SECRET:
    import secrets
    JWT_SECRET = secrets.token_hex(32)

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRES_IN_DAYS", "7"))
SALT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))

def get_google_client_id() -> str:
    load_dotenv(override=True)
    return os.getenv("GOOGLE_CLIENT_ID", "").strip()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(SALT_ROUNDS)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, name: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    encoded_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None

def verify_google_credential(credential_token: str) -> Optional[Dict[str, Any]]:
    token = credential_token.strip()
    if not token:
        return None

    try:
        quoted_token = urllib.parse.quote_plus(token)
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={quoted_token}"
        req = urllib.request.Request(url, headers={"User-Agent": "Algorbit-Auth/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                client_id = get_google_client_id()
                if client_id and data.get("aud") != client_id:
                    return None
                
                email = data.get("email")
                if not email:
                    return None

                email_verified = data.get("email_verified") == "true" or data.get("email_verified") is True
                if not email_verified:
                    return None

                return {
                    "google_id": data.get("sub"),
                    "email": email,
                    "name": data.get("name", email.split("@")[0]),
                    "picture": data.get("picture"),
                    "email_verified": True
                }
    except Exception:
        return None

    return None
