from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import CASSANDRA_KEYSPACE, DEFAULT_LIMIT, MAX_LIMIT
from .data_generator import generate_events, stats_for
from .db import store
from .schema import SCHEMA_METADATA
from .validation import validate_purchase_table_design, validate_read_only_cql

app = FastAPI(title="Wide-Column Cassandra Tutorial API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoadRequest(BaseModel):
    seed: int = 42
    size: Literal["small", "large"] = "small"


class SandboxRequest(BaseModel):
    cql: str = Field(min_length=8, max_length=2000)


class DesignRequest(BaseModel):
    partitionKeys: list[str]
    clusteringColumns: list[str]
    clusteringOrder: str = "DESC"


def _limit(value: int) -> int:
    return max(1, min(value, MAX_LIMIT))


@app.get("/api/health")
def health():
    return {"backend": "ok", "cassandra": store.health()}


@app.get("/api/status")
def status():
    state = store.status()
    if state.get("keyspace"):
        counts = {}
        for table, exists in state["tables"].items():
            if exists:
                try:
                    counts[table] = store.count_table(table)
                except Exception:
                    counts[table] = None
        state["rowCounts"] = counts
    return state


@app.post("/api/database/initialize")
def initialize():
    try:
        return store.initialize()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/api/database/reset")
def reset(confirm: bool = Query(False)):
    if not confirm:
        raise HTTPException(status_code=400, detail="Reset requires confirm=true.")
    try:
        return store.reset()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/api/data/generate")
def generate(request: LoadRequest):
    events = generate_events(seed=request.seed, size=request.size)
    return stats_for(events) | {"seed": request.seed, "size": request.size}


@app.post("/api/data/load")
def load(request: LoadRequest):
    try:
        return store.load_sample_data(seed=request.seed, size=request.size)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/api/data/stats")
def data_stats():
    return store.last_loaded_stats or {"events": 0, "message": "No dataset loaded in this backend process yet."}


@app.get("/api/schema/tables")
def schema_tables():
    return SCHEMA_METADATA


@app.get("/api/schema/tables/{table_name}")
def schema_table(table_name: str):
    for table in SCHEMA_METADATA:
        if table["name"] == table_name:
            return table
    raise HTTPException(status_code=404, detail="Unknown tutorial table")


@app.get("/api/events/by-user")
def events_by_user(userId: str, eventDate: date, limit: int = DEFAULT_LIMIT):
    cql = f"SELECT * FROM {CASSANDRA_KEYSPACE}.events_by_user WHERE user_id=%s AND event_date=%s LIMIT %s"
    rows, duration = store.query(cql, [userId, eventDate, _limit(limit)], _limit(limit))
    return {"rows": rows, "durationMs": duration, "table": "events_by_user"}


@app.get("/api/events/by-type")
def events_by_type(eventType: str, eventDate: date, limit: int = DEFAULT_LIMIT):
    cql = f"SELECT * FROM {CASSANDRA_KEYSPACE}.events_by_type WHERE event_type=%s AND event_date=%s LIMIT %s"
    rows, duration = store.query(cql, [eventType, eventDate, _limit(limit)], _limit(limit))
    return {"rows": rows, "durationMs": duration, "table": "events_by_type"}


@app.get("/api/errors/by-service")
def errors_by_service(service: str, eventDate: date, limit: int = DEFAULT_LIMIT):
    cql = f"SELECT * FROM {CASSANDRA_KEYSPACE}.errors_by_service WHERE service=%s AND event_date=%s LIMIT %s"
    rows, duration = store.query(cql, [service, eventDate, _limit(limit)], _limit(limit))
    return {"rows": rows, "durationMs": duration, "table": "errors_by_service"}


@app.get("/api/events/by-device")
def events_by_device(deviceId: str, eventDate: date, limit: int = DEFAULT_LIMIT):
    cql = f"SELECT * FROM {CASSANDRA_KEYSPACE}.events_by_device WHERE device_id=%s AND event_date=%s LIMIT %s"
    rows, duration = store.query(cql, [deviceId, eventDate, _limit(limit)], _limit(limit))
    return {"rows": rows, "durationMs": duration, "table": "events_by_device"}


@app.get("/api/activity/daily")
def daily_activity(userId: str, limit: int = 100):
    cql = f"SELECT * FROM {CASSANDRA_KEYSPACE}.daily_user_activity WHERE user_id=%s LIMIT %s"
    rows, duration = store.query(cql, [userId, _limit(limit)], _limit(limit))
    return {"rows": rows, "durationMs": duration, "table": "daily_user_activity"}


@app.get("/api/events/{event_id}/copies")
def event_copies(event_id: UUID):
    cql = f"SELECT * FROM {CASSANDRA_KEYSPACE}.event_copies WHERE event_id=%s"
    rows, duration = store.query(cql, [event_id], 20)
    return {"rows": rows, "durationMs": duration, "table": "event_copies"}


@app.post("/api/query/read-only")
def read_only_query(request: SandboxRequest):
    try:
        cql = validate_read_only_cql(request.cql)
        rows, duration = store.query(cql, [], 50)
        return {"cql": cql, "rows": rows, "durationMs": duration}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/design/validate")
def design_validate(request: DesignRequest):
    return validate_purchase_table_design(request.partitionKeys, request.clusteringColumns, request.clusteringOrder)


@app.post("/api/benchmark/run")
def benchmark(request: LoadRequest):
    import time

    started = time.perf_counter()
    stats = store.load_sample_data(seed=request.seed, size=request.size)
    load_ms = round((time.perf_counter() - started) * 1000, 2)
    day = stats["days"][-1]
    lookup_start = time.perf_counter()
    rows, _ = store.query(
        f"SELECT * FROM {CASSANDRA_KEYSPACE}.events_by_user WHERE user_id=%s AND event_date=%s LIMIT 25",
        ["user_001", day],
        25,
    )
    lookup_ms = round((time.perf_counter() - lookup_start) * 1000, 2)
    return {
        "warning": "A single local Docker node is not representative of a production Cassandra cluster.",
        "loadedEvents": stats["events"],
        "loadDurationMs": load_ms,
        "approxInsertRowsPerSecond": round(stats["events"] / max(load_ms / 1000, 0.001), 2),
        "knownPartitionLookupMs": lookup_ms,
        "lookupRows": len(rows),
    }
