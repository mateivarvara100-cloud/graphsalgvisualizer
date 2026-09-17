import os
import secrets
import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Request, Response, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from database import get_users_collection, is_db_connected, get_db_status
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    verify_google_credential,
    JWT_EXPIRE_DAYS,
    get_google_client_id
)
from email_service import send_password_reset_email

logger = logging.getLogger("auth_security")
router = APIRouter()

class SlidingWindowLimiter:
    def __init__(self):
        self._history = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        cutoff = now - window_seconds
        self._history[key] = [t for t in self._history[key] if t > cutoff]
        if len(self._history[key]) >= max_requests:
            return False
        self._history[key].append(now)
        return True

    def reset(self, key: str):
        if key in self._history:
            del self._history[key]

login_limiter = SlidingWindowLimiter()
register_limiter = SlidingWindowLimiter()
forgot_pw_limiter = SlidingWindowLimiter()
reset_pw_limiter = SlidingWindowLimiter()
google_auth_limiter = SlidingWindowLimiter()

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def mask_ip_for_log(ip: str) -> str:
    if not ip:
        return "unknown"
    if ip in ("127.0.0.1", "::1", "localhost"):
        return "localhost"
    parts = ip.split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.***.***"
    if ":" in ip:
        return ip.split(":")[0] + ":****:****"
    return "***"

def mask_email_for_log(email: str) -> str:
    if not email or "@" not in email:
        return "***"
    parts = email.split("@", 1)
    username, domain = parts[0], parts[1]
    masked_user = (username[:2] + "***") if len(username) > 2 else (username[0] + "***" if username else "***")
    return f"{masked_user}@{domain}"

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = Field(None, max_length=50)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)

class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=10, max_length=4096)
    mode: Optional[str] = "login"

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=12)
    new_password: str = Field(..., min_length=8, max_length=128)

def set_auth_cookie(response: Response, token: str):
    max_age = JWT_EXPIRE_DAYS * 86400
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    response.set_cookie(
        key="access_token",
        value=token,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        samesite="lax",
        secure=is_prod,
        path="/"
    )

def clear_auth_cookie(response: Response):
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite="lax",
        secure=is_prod
    )

def get_current_user_from_request(request: Request) -> Optional[dict]:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return None
        
    return decode_access_token(token)

@router.get("/status")
def get_auth_system_status():
    """Checks MongoDB connection and OAuth setup status."""
    db_status = get_db_status()
    google_id = get_google_client_id()
    return {
        "status": "healthy",
        "database": db_status,
        "google_auth_configured": bool(google_id),
        "google_client_id": google_id or None
    }

@router.post("/register")
def register_user(request: Request, body: RegisterRequest, response: Response):
    client_ip = get_client_ip(request)
    if not register_limiter.is_allowed(f"reg_ip:{client_ip}", max_requests=5, window_seconds=900):
        logger.warning(f"Registration rate limit exceeded for IP: {mask_ip_for_log(client_ip)}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts from this IP. Please try again in 15 minutes."
        )

    if not is_db_connected():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable. Please verify MongoDB is running."
        )

    users = get_users_collection()
    normalized_email = body.email.lower().strip()
    
    existing = users.find_one({"email": normalized_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in."
        )
    
    password_hash = hash_password(body.password)
    user_name = body.name.strip() if body.name and body.name.strip() else normalized_email.split("@")[0]
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "email": normalized_email,
        "password_hash": password_hash,
        "name": user_name,
        "auth_provider": "local",
        "picture": None,
        "created_at": now,
        "updated_at": now
    }
    
    result = users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    logger.info(f"User registered successfully: {mask_email_for_log(normalized_email)} from IP {mask_ip_for_log(client_ip)}")
    
    token = create_access_token(user_id, normalized_email, user_name)
    set_auth_cookie(response, token)
    
    return {
        "status": "success",
        "message": "Account registered successfully.",
        "token": token,
        "user": {
            "id": user_id,
            "email": normalized_email,
            "name": user_name,
            "auth_provider": "local",
            "picture": None
        }
    }

@router.post("/login")
def login_user(request: Request, body: LoginRequest, response: Response):
    client_ip = get_client_ip(request)
    normalized_email = body.email.lower().strip()

    ip_key = f"login_ip:{client_ip}"
    email_key = f"login_email:{normalized_email}"

    if not login_limiter.is_allowed(ip_key, max_requests=10, window_seconds=60) or \
       not login_limiter.is_allowed(email_key, max_requests=10, window_seconds=60):
        logger.warning(f"Login rate limit reached for IP: {mask_ip_for_log(client_ip)} / Email: {mask_email_for_log(normalized_email)}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 60 seconds before trying again."
        )

    if not is_db_connected():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable. Please verify MongoDB is running."
        )

    users = get_users_collection()
    user = users.find_one({"email": normalized_email})
    if not user:
        logger.warning(f"Failed login (user not found) for {mask_email_for_log(normalized_email)} from IP {mask_ip_for_log(client_ip)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    stored_hash = user.get("password_hash")
    if not stored_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account was registered with Google. Please use 'Continue with Google' to sign in."
        )
    
    if not verify_password(body.password, stored_hash):
        logger.warning(f"Failed login (bad password) for {mask_email_for_log(normalized_email)} from IP {mask_ip_for_log(client_ip)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
        
    user_id = str(user["_id"])
    display_name = user.get("name", normalized_email.split("@")[0])
    
    login_limiter.reset(ip_key)
    login_limiter.reset(email_key)
    logger.info(f"User logged in: {mask_email_for_log(normalized_email)} from IP {mask_ip_for_log(client_ip)}")

    token = create_access_token(user_id, normalized_email, display_name)
    set_auth_cookie(response, token)
    
    return {
        "status": "success",
        "message": "Logged in successfully.",
        "token": token,
        "user": {
            "id": user_id,
            "email": normalized_email,
            "name": display_name,
            "auth_provider": user.get("auth_provider", "local"),
            "picture": user.get("picture")
        }
    }

@router.post("/google")
def google_auth(request: Request, body: GoogleAuthRequest, response: Response):
    client_ip = get_client_ip(request)
    if not google_auth_limiter.is_allowed(f"gauth_ip:{client_ip}", max_requests=15, window_seconds=60):
        logger.warning(f"Google auth rate limit reached for IP: {mask_ip_for_log(client_ip)}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again in 1 minute."
        )

    if not is_db_connected():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable."
        )

    google_data = verify_google_credential(body.credential)
    if not google_data or not google_data.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired Google authentication credential."
        )

    users = get_users_collection()
    email = google_data["email"].lower().strip()
    name = google_data.get("name") or email.split("@")[0]
    picture = google_data.get("picture")
    google_id = google_data.get("google_id")
    now = datetime.now(timezone.utc)

    user = users.find_one({"email": email})
    mode = (body.mode or "login").lower().strip()

    if not user:
        if mode == "login":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this Google email. Please click the Register tab to create your account."
            )

        user_doc = {
            "email": email,
            "name": name,
            "google_id": google_id,
            "picture": picture,
            "auth_provider": "google",
            "password_hash": None,
            "created_at": now,
            "updated_at": now
        }
        result = users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        display_name = name
        logger.info(f"New Google user registered: {mask_email_for_log(email)} from IP {mask_ip_for_log(client_ip)}")
    else:
        user_id = str(user["_id"])
        update_fields = {"updated_at": now}
        if picture and not user.get("picture"):
            update_fields["picture"] = picture
        if google_id and not user.get("google_id"):
            update_fields["google_id"] = google_id
            
        users.update_one({"_id": user["_id"]}, {"$set": update_fields})
        display_name = user.get("name", name)
        logger.info(f"Existing Google user logged in: {mask_email_for_log(email)} from IP {mask_ip_for_log(client_ip)}")

    token = create_access_token(user_id, email, display_name)
    set_auth_cookie(response, token)

    return {
        "status": "success",
        "message": "Authenticated with Google.",
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "name": display_name,
            "auth_provider": "google",
            "picture": picture
        }
    }

@router.get("/me")
def get_current_user(request: Request):
    payload = get_current_user_from_request(request)
    if not payload:
        return {
            "authenticated": False,
            "user": None
        }

    user_id = payload.get("sub")
    users = get_users_collection()
    
    try:
        if is_db_connected():
            db_user = users.find_one({"_id": ObjectId(user_id)})
            if db_user:
                return {
                    "authenticated": True,
                    "user": {
                        "id": str(db_user["_id"]),
                        "email": db_user.get("email"),
                        "name": db_user.get("name"),
                        "picture": db_user.get("picture"),
                        "auth_provider": db_user.get("auth_provider", "local")
                    }
                }
    except Exception:
        pass

    return {
        "authenticated": True,
        "user": {
            "id": user_id,
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": None,
            "auth_provider": "local"
        }
    }

@router.post("/logout")
def logout_user(response: Response):
    clear_auth_cookie(response)
    return {
        "status": "success",
        "message": "Logged out successfully."
    }

@router.post("/forgot-password")
def forgot_password(request: Request, body: ForgotPasswordRequest):
    client_ip = get_client_ip(request)
    normalized_email = body.email.lower().strip()

    if not forgot_pw_limiter.is_allowed(f"fp_ip:{client_ip}", max_requests=5, window_seconds=900) or \
       not forgot_pw_limiter.is_allowed(f"fp_email:{normalized_email}", max_requests=3, window_seconds=900):
        logger.warning(f"Forgot password rate limit exceeded for {mask_email_for_log(normalized_email)} from IP {mask_ip_for_log(client_ip)}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Please wait 15 minutes before requesting another code."
        )

    if not is_db_connected():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable. Please verify MongoDB is running."
        )

    users = get_users_collection()
    user = users.find_one({"email": normalized_email})

    generic_msg = f"If an account is associated with {normalized_email}, a 6-digit verification code has been dispatched. Please check your inbox and spam folder."

    if not user or (user.get("auth_provider") == "google" and not user.get("password_hash")):
        return {
            "status": "success",
            "message": generic_msg,
            "email": normalized_email,
            "expires_in_minutes": 15
        }

    reset_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_code": reset_code,
                "reset_code_expires_at": expires_at,
                "reset_attempts": 0,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    logger.info(f"Password reset code generated and dispatched to {mask_email_for_log(normalized_email)}")

    send_password_reset_email(
        to_email=normalized_email,
        reset_code=reset_code,
        user_name=user.get("name", "")
    )

    return {
        "status": "success",
        "message": generic_msg,
        "email": normalized_email,
        "expires_in_minutes": 15
    }

@router.post("/reset-password")
def reset_password(request: Request, body: ResetPasswordRequest):
    client_ip = get_client_ip(request)
    if not reset_pw_limiter.is_allowed(f"reset_ip:{client_ip}", max_requests=10, window_seconds=900):
        logger.warning(f"Reset password rate limit exceeded for IP: {mask_ip_for_log(client_ip)}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset verification attempts. Please try again later."
        )

    if not is_db_connected():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable. Please verify MongoDB is running."
        )

    users = get_users_collection()
    normalized_email = body.email.lower().strip()
    submitted_code = body.code.strip()

    user = users.find_one({"email": normalized_email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new verification code."
        )

    stored_code = user.get("reset_code")
    expires_at = user.get("reset_code_expires_at")
    reset_attempts = user.get("reset_attempts", 0)

    if not stored_code or not expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new verification code."
        )

    if reset_attempts >= 5:
        users.update_one(
            {"_id": user["_id"]},
            {
                "$unset": {
                    "reset_code": "",
                    "reset_code_expires_at": "",
                    "reset_attempts": ""
                }
            }
        )
        logger.warning(f"Password reset code invalidated due to excessive failed attempts for {mask_email_for_log(normalized_email)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. This reset code has been invalidated. Please request a new one."
        )

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification code has expired. Please request a new one."
        )

    if not secrets.compare_digest(str(stored_code), str(submitted_code)):
        users.update_one({"_id": user["_id"]}, {"$inc": {"reset_attempts": 1}})
        remaining = 4 - reset_attempts
        logger.warning(f"Invalid reset code attempt for {mask_email_for_log(normalized_email)} from IP {mask_ip_for_log(client_ip)} ({remaining} remaining)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {max(0, remaining)} attempt(s) remaining." if remaining > 0 else "Invalid verification code. This code has been invalidated."
        )

    new_hash = hash_password(body.new_password)
    now = datetime.now(timezone.utc)

    users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "updated_at": now
            },
            "$unset": {
                "reset_code": "",
                "reset_code_expires_at": "",
                "reset_attempts": ""
            }
        }
    )
    logger.info(f"Password reset successfully completed for {mask_email_for_log(normalized_email)} from IP {mask_ip_for_log(client_ip)}")

    return {
        "status": "success",
        "message": "Your password has been reset successfully. You can now sign in with your new password."
    }


