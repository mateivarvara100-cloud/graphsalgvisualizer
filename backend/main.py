import os
import time
import logging
from collections import defaultdict
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from algorithms.BFS import run_bfs
from algorithms.DFS import run_dfs
from algorithms.Kruskal import run_kruskal
from algorithms.Prim import run_prim
from algorithms.Dijkstra import run_dijkstra
from algorithms.Floyd_Warshall import run_floyd_warshall
from algorithms.FordFulkerson import run_ford_fulkerson
from algorithms.EdmondsKarp import run_edmonds_karp
from algorithms.Kosaraju import run_kosaraju
from algorithms.Tarjan import run_tarjan
from auth_routes import router as auth_router
from quiz_routes import router as quiz_router
from assistant_routes import router as assistant_router

load_dotenv()

logger = logging.getLogger("main_security")

is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
debug_mode = (os.getenv("DEBUG", "false" if is_prod else "true").lower() == "true") and not is_prod

default_enable_docs = "false" if is_prod else "true"
enable_docs = os.getenv("ENABLE_DOCS", default_enable_docs).lower() == "true"

MAX_GRAPH_NODES = int(os.getenv("MAX_GRAPH_NODES", "500"))
MAX_GRAPH_EDGES = int(os.getenv("MAX_GRAPH_EDGES", "2500"))
MAX_FLOYD_WARSHALL_NODES = int(os.getenv("MAX_FLOYD_WARSHALL_NODES", "30"))

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

algo_limiter = SlidingWindowLimiter()

def check_algo_rate_limit(request: Request, max_req: int = 60, window: int = 60):
    forwarded = request.headers.get("X-Forwarded-For")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
    if not algo_limiter.is_allowed(f"algo_ip:{ip}", max_requests=max_req, window_seconds=window):
        raise HTTPException(
            status_code=429,
            detail="Algorithm computation rate limit exceeded. Please wait a moment before sending more requests."
        )

def validate_node_count(count: int):
    if count > MAX_GRAPH_NODES:
        raise HTTPException(
            status_code=400,
            detail=f"Graph node count ({count}) exceeds maximum allowed limit of {MAX_GRAPH_NODES} nodes."
        )

def validate_edge_count(count: int):
    if count > MAX_GRAPH_EDGES:
        raise HTTPException(
            status_code=400,
            detail=f"Graph edge count ({count}) exceeds maximum allowed limit of {MAX_GRAPH_EDGES} edges."
        )

def validate_floyd_warshall_node_count(count: int):
    if count > MAX_FLOYD_WARSHALL_NODES:
        raise HTTPException(
            status_code=400,
            detail=f"Floyd-Warshall node count ({count}) exceeds maximum allowed limit of {MAX_FLOYD_WARSHALL_NODES} nodes due to O(V^3) computational limits."
        )

def validate_start_node(graph: Dict[str, Any], start_node: str):
    if not graph:
        raise HTTPException(status_code=400, detail="Graph cannot be empty.")
    if start_node not in graph:
        raise HTTPException(
            status_code=400,
            detail=f"Start node '{start_node}' does not exist in the provided graph."
        )

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
if allowed_origins_raw == "*" or not allowed_origins_raw.strip():
    allowed_origins = ["*"]
else:
    allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]

allow_credentials = (
    "*" not in allowed_origins
    and os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"
)

allowed_methods_raw = os.getenv("ALLOWED_METHODS", "GET,POST,OPTIONS")
allowed_methods = ["*"] if allowed_methods_raw == "*" else [m.strip() for m in allowed_methods_raw.split(",") if m.strip()]

allowed_headers_raw = os.getenv("ALLOWED_HEADERS", "*")
allowed_headers = ["*"] if allowed_headers_raw == "*" else [h.strip() for h in allowed_headers_raw.split(",") if h.strip()]

allow_origin_regex_raw = os.getenv("ALLOWED_ORIGIN_REGEX", "").strip()
allow_origin_regex = allow_origin_regex_raw if allow_origin_regex_raw else None

app = FastAPI(
    title=os.getenv("APP_NAME", "Algorbit API"),
    version=os.getenv("APP_VERSION", "1.0.0"),
    debug=debug_mode,
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; object-src 'none';"
    
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    if is_prod or request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=allow_credentials,
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(quiz_router, prefix="/api/quiz", tags=["quiz"])
app.include_router(assistant_router, prefix="/api/assistant", tags=["assistant"])

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error at {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "detail": "An internal server error occurred. Please try again later."}
    )

class GraphData(BaseModel):
    graph: Dict[str, List[str]]
    start_node: str
    is_directed: Optional[bool] = False

class WeightedGraphData(BaseModel):
    graph: Optional[Dict[str, Any]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    start_node: Optional[str] = "A"

class DijkstraData(BaseModel):
    graph: Dict[str, Dict[str, float]]
    start_node: str

class FloydData(BaseModel):
    graph: Dict[str, Dict[str, float]]

class FlowData(BaseModel):
    vertices: List[str]
    edges: List[Dict[str, Any]]
    source: str
    sink: str

class SCCData(BaseModel):
    graph: Dict[str, List[str]]

@app.get("/")
@app.get("/api/health")
def api_health():
    return {
        "message": "Algorbit Graph Algorithms Visualizer API is running",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "status": "healthy"
    }

@app.post("/api/bfs")
def api_bfs(request: Request, data: GraphData):
    check_algo_rate_limit(request)
    validate_node_count(len(data.graph))
    validate_start_node(data.graph, data.start_node)
    steps = run_bfs(data.graph, data.start_node, is_directed=bool(data.is_directed))
    return {"algorithm": "BFS", "steps": steps}

@app.post("/api/dfs")
def api_dfs(request: Request, data: GraphData):
    check_algo_rate_limit(request)
    validate_node_count(len(data.graph))
    validate_start_node(data.graph, data.start_node)
    steps = run_dfs(data.graph, data.start_node, is_directed=bool(data.is_directed))
    return {"algorithm": "DFS", "steps": steps}

@app.post("/api/kruskal")
def api_kruskal(request: Request, data: WeightedGraphData):
    check_algo_rate_limit(request)
    if data.graph:
        validate_node_count(len(data.graph))
    if data.edges:
        validate_edge_count(len(data.edges))
    steps = run_kruskal(data.graph, data.edges)
    return {"algorithm": "Kruskal", "steps": steps}

@app.post("/api/prim")
def api_prim(request: Request, data: WeightedGraphData):
    check_algo_rate_limit(request)
    if data.graph:
        validate_node_count(len(data.graph))
        if data.start_node and data.start_node not in data.graph:
            data.start_node = next(iter(data.graph))
    if data.edges:
        validate_edge_count(len(data.edges))
    steps = run_prim(data.graph, data.start_node, data.edges)
    return {"algorithm": "Prim", "steps": steps}

@app.post("/api/dijkstra")
def api_dijkstra(request: Request, data: DijkstraData):
    check_algo_rate_limit(request)
    validate_node_count(len(data.graph))
    validate_start_node(data.graph, data.start_node)
    steps = run_dijkstra(data.graph, data.start_node)
    return {"algorithm": "Dijkstra", "steps": steps}

@app.post("/api/floydwarshall")
def api_floyd_warshall(request: Request, data: FloydData):
    check_algo_rate_limit(request)
    if not data.graph:
        raise HTTPException(status_code=400, detail="Graph cannot be empty.")
    validate_floyd_warshall_node_count(len(data.graph))
    steps = run_floyd_warshall(data.graph)
    return {"algorithm": "FloydWarshall", "steps": steps}

@app.post("/api/fordfulkerson")
def api_ford_fulkerson(request: Request, data: FlowData):
    check_algo_rate_limit(request)
    validate_node_count(len(data.vertices))
    if data.edges:
        validate_edge_count(len(data.edges))
    steps = run_ford_fulkerson(
        vertices=data.vertices,
        source=data.source,
        sink=data.sink,
        edges=data.edges,
    )
    return {"algorithm": "FordFulkerson", "steps": steps}

@app.post("/api/edmondskarp")
def api_edmonds_karp(request: Request, data: FlowData):
    check_algo_rate_limit(request)
    validate_node_count(len(data.vertices))
    if data.edges:
        validate_edge_count(len(data.edges))
    steps = run_edmonds_karp(
        vertices=data.vertices,
        source=data.source,
        sink=data.sink,
        edges=data.edges,
    )
    return {"algorithm": "EdmondsKarp", "steps": steps}

@app.post("/api/kosaraju")
def api_kosaraju(request: Request, data: SCCData):
    check_algo_rate_limit(request)
    if not data.graph:
        raise HTTPException(status_code=400, detail="Graph cannot be empty.")
    validate_node_count(len(data.graph))
    steps = run_kosaraju(data.graph)
    return {"algorithm": "Kosaraju", "steps": steps}

@app.post("/api/tarjan")
def api_tarjan(request: Request, data: SCCData):
    check_algo_rate_limit(request)
    if not data.graph:
        raise HTTPException(status_code=400, detail="Graph cannot be empty.")
    validate_node_count(len(data.graph))
    steps = run_tarjan(data.graph)
    return {"algorithm": "Tarjan", "steps": steps}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1").strip() or "127.0.0.1"
    try:
        port = int(os.getenv("PORT", "8000"))
    except ValueError:
        port = 8000
    reload = os.getenv("DEBUG", "false").lower() == "true"
    uvicorn.run("main:app", host=host, port=port, reload=reload)
