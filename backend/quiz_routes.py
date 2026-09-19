import os
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, Response, HTTPException, status
from pydantic import BaseModel, Field

from database import get_quiz_results_collection, is_db_connected
from auth_routes import get_current_user_from_request

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

quiz_limiter = SlidingWindowLimiter()

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

class QuizResultItem(BaseModel):
    algorithm: str = Field(..., min_length=1, max_length=100)
    mode: str = Field("practice", max_length=50)
    score: int = Field(..., ge=0, le=1000)
    total: int = Field(..., ge=1, le=1000)
    percentage: int = Field(..., ge=0, le=100)
    grade_badge: Optional[str] = Field("Intermediate", max_length=50)
    guest_session_id: Optional[str] = Field(None, max_length=100)

class SyncResultsRequest(BaseModel):
    results: List[QuizResultItem] = Field(..., max_length=50)

def clear_guest_cookie(response: Response):
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    response.delete_cookie(
        key="guest_quiz_session",
        path="/",
        samesite="lax",
        secure=is_prod
    )

@router.post("/results")
def save_quiz_result(body: QuizResultItem, request: Request, response: Response):
    client_ip = get_client_ip(request)
    if not quiz_limiter.is_allowed(f"quiz_ip:{client_ip}", max_requests=30, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for quiz submissions. Please wait a moment before submitting more results."
        )

    user_payload = get_current_user_from_request(request)
    user_id = user_payload.get("sub") if user_payload else None

    if not user_id:
        clear_guest_cookie(response)
        now = datetime.now(timezone.utc)
        temp_id = f"guest_{uuid.uuid4().hex}"
        return {
            "status": "success",
            "result_id": temp_id,
            "result": {
                "id": temp_id,
                "algorithm": body.algorithm,
                "mode": body.mode,
                "score": body.score,
                "total": body.total,
                "percentage": body.percentage,
                "grade_badge": body.grade_badge,
                "created_at": now.isoformat()
            }
        }

    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database is unavailable.")

    collection = get_quiz_results_collection()
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": user_id,
        "guest_session_id": None,
        "algorithm": body.algorithm,
        "mode": body.mode,
        "score": body.score,
        "total": body.total,
        "percentage": body.percentage,
        "grade_badge": body.grade_badge,
        "created_at": now
    }

    res = collection.insert_one(doc)

    return {
        "status": "success",
        "result_id": str(res.inserted_id),
        "result": {
            "id": str(res.inserted_id),
            "algorithm": body.algorithm,
            "mode": body.mode,
            "score": body.score,
            "total": body.total,
            "percentage": body.percentage,
            "grade_badge": body.grade_badge,
            "created_at": now.isoformat()
        }
    }

@router.get("/results")
def get_quiz_results(request: Request, response: Response):
    user_payload = get_current_user_from_request(request)
    user_id = user_payload.get("sub") if user_payload else None

    if not user_id:
        clear_guest_cookie(response)
        return {
            "status": "success",
            "results": [],
            "latest_by_algorithm": {},
            "stats": {"total_tests": 0, "avg_score": 0}
        }

    if not is_db_connected():
        return {
            "status": "offline",
            "results": [],
            "latest_by_algorithm": {},
            "stats": {"total_tests": 0, "avg_score": 0}
        }

    collection = get_quiz_results_collection()
    docs = list(collection.find({"user_id": user_id}).sort("created_at", -1).limit(200))

    results = []
    latest_by_algorithm = {}
    total_percentage = 0

    for d in docs:
        alg = d.get("algorithm")
        created_str = d.get("created_at").isoformat() if hasattr(d.get("created_at"), "isoformat") else str(d.get("created_at"))
        item = {
            "id": str(d["_id"]),
            "algorithm": alg,
            "mode": d.get("mode", "practice"),
            "score": d.get("score", 0),
            "total": d.get("total", 10),
            "percentage": d.get("percentage", 0),
            "grade_badge": d.get("grade_badge", "Intermediate"),
            "created_at": created_str
        }
        results.append(item)
        total_percentage += item["percentage"]

        if alg and alg not in latest_by_algorithm:
            latest_by_algorithm[alg] = item

    avg_score = round(total_percentage / len(results)) if results else 0

    return {
        "status": "success",
        "results": results,
        "latest_by_algorithm": latest_by_algorithm,
        "stats": {
            "total_tests": len(results),
            "avg_score": avg_score
        }
    }

@router.post("/sync")
def sync_local_results(body: SyncResultsRequest, request: Request):
    client_ip = get_client_ip(request)
    if not quiz_limiter.is_allowed(f"sync_ip:{client_ip}", max_requests=10, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded for quiz sync. Please wait a moment before trying again."
        )

    user_payload = get_current_user_from_request(request)
    if not user_payload or not user_payload.get("sub"):
        return {"status": "skipped", "message": "User not authenticated."}

    user_id = user_payload.get("sub")
    collection = get_quiz_results_collection()
    now = datetime.now(timezone.utc)
    inserted_count = 0

    for item in body.results:
        existing = collection.find_one({
            "user_id": user_id,
            "algorithm": item.algorithm,
            "percentage": item.percentage,
            "mode": item.mode
        })
        if not existing:
            collection.insert_one({
                "user_id": user_id,
                "guest_session_id": None,
                "algorithm": item.algorithm,
                "mode": item.mode,
                "score": item.score,
                "total": item.total,
                "percentage": item.percentage,
                "grade_badge": item.grade_badge,
                "created_at": now
            })
            inserted_count += 1

    return {"status": "success", "synced_count": inserted_count}
