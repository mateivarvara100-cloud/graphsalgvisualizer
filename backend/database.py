import os
import re
from typing import Optional
from pymongo import MongoClient, ASCENDING
import mongomock
from dotenv import load_dotenv

client = None
db = None
users_collection = None
is_mock = False
last_error = None
active_uri = None

def sanitize_mongo_uri(uri: Optional[str]) -> str:
    if not uri:
        return ""
    return re.sub(r'://([^:]+):([^@]+)@', r'://\1:******@', str(uri))

def init_database():
    global client, db, users_collection, is_mock, last_error, active_uri
    load_dotenv(override=True)
    mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    mongo_db_name = os.getenv("MONGO_DB_NAME", "algorbit_db")
    active_uri = mongo_uri
    
    try:
        real_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        real_client.admin.command("ping")
        client = real_client
        db = client[mongo_db_name]
        users_collection = db["users"]
        is_mock = False
        last_error = None
        try:
            users_collection.create_index([("email", ASCENDING)], unique=True)
        except Exception:
            pass
        print(f"[MongoDB] Successfully connected to live database: {mongo_db_name}")
        return db
    except Exception as e:
        last_error = sanitize_mongo_uri(str(e))
        safe_uri = sanitize_mongo_uri(mongo_uri)
        print(f"[MongoDB] Connection to {safe_uri} failed: {last_error}")
        if not is_mock or db is None:
            mock_client = mongomock.MongoClient()
            client = mock_client
            db = client[mongo_db_name]
            users_collection = db["users"]
            is_mock = True
            try:
                users_collection.create_index([("email", ASCENDING)], unique=True)
            except Exception:
                pass
        return db

def get_database():
    global db, active_uri
    load_dotenv(override=True)
    current_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    if db is None or active_uri != current_uri or (is_mock and "mongodb+srv" in current_uri):
        init_database()
    return db

def get_users_collection():
    global users_collection
    get_database()
    return users_collection

def get_quiz_results_collection():
    database = get_database()
    coll = database["quiz_results"]
    try:
        coll.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
        coll.create_index([("guest_session_id", ASCENDING)])
    except Exception:
        pass
    return coll

def is_db_connected() -> bool:
    global client
    get_database()
    return client is not None

def get_db_status() -> dict:
    global is_mock, last_error
    get_database()
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    sanitized_error = None
    if not is_prod and last_error:
        sanitized_error = sanitize_mongo_uri(last_error)
    db_name = os.getenv("MONGO_DB_NAME", "algorbit_db") if not is_prod else "live"
    return {
        "connected": client is not None,
        "is_mock": is_mock,
        "mode": "in_memory_fallback" if is_mock else "mongodb_live",
        "database": db_name,
        "last_error": sanitized_error
    }
