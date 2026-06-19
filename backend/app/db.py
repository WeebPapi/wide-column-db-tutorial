from __future__ import annotations

from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
import time
from typing import Any

try:
    from cassandra.cluster import Cluster
    from cassandra.query import dict_factory
except Exception:  # Allows unit tests on hosts where cassandra-driver is unavailable or incompatible.
    Cluster = None
    dict_factory = None

from .config import CASSANDRA_HOSTS, CASSANDRA_KEYSPACE, CASSANDRA_PORT, DEFAULT_LIMIT, MAX_LIMIT
from .data_generator import Event, generate_events, stats_for, summarize
from .schema import DROP_TABLES_CQL, KEYSPACE_CQL, TABLES


class CassandraStore:
    def __init__(self):
        self.cluster: Cluster | None = None
        self.session = None
        self.last_loaded_stats: dict[str, Any] | None = None

    def connect(self, attempts: int = 1, delay: float = 2.0):
        if Cluster is None:
            raise RuntimeError("cassandra-driver is not installed. Use Docker or install backend requirements with Python 3.12.")
        last_error = None
        for _ in range(attempts):
            try:
                if self.session:
                    return self.session
                self.cluster = Cluster(CASSANDRA_HOSTS, port=CASSANDRA_PORT)
                self.session = self.cluster.connect()
                self.session.row_factory = dict_factory
                return self.session
            except Exception as exc:  # Cassandra startup errors vary by timing.
                last_error = exc
                time.sleep(delay)
        raise last_error or RuntimeError("Could not connect to Cassandra")

    def close(self):
        if self.cluster:
            self.cluster.shutdown()

    def health(self) -> dict[str, Any]:
        try:
            session = self.connect(attempts=1, delay=0)
            row = session.execute("SELECT release_version FROM system.local").one()
            return {"connected": True, "version": row["release_version"], "error": None}
        except Exception as exc:
            return {"connected": False, "version": None, "error": str(exc)}

    def initialize(self) -> dict[str, Any]:
        session = self.connect(attempts=30, delay=2)
        session.execute(KEYSPACE_CQL)
        session.set_keyspace(CASSANDRA_KEYSPACE)
        for cql in TABLES.values():
            session.execute(cql)
        return {"ok": True, "tables": list(TABLES)}

    def reset(self) -> dict[str, Any]:
        session = self.connect(attempts=10, delay=1)
        session.execute(KEYSPACE_CQL)
        for cql in DROP_TABLES_CQL:
            session.execute(cql)
        self.last_loaded_stats = None
        return self.initialize()

    def status(self) -> dict[str, Any]:
        health = self.health()
        if not health["connected"]:
            return {"backend": "ok", "cassandra": health, "keyspace": False, "tables": {}, "datasetLoaded": False}
        session = self.connect()
        keyspace_rows = list(session.execute("SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name=%s", [CASSANDRA_KEYSPACE]))
        table_status = {}
        if keyspace_rows:
            for name in TABLES:
                rows = list(session.execute(
                    "SELECT table_name FROM system_schema.tables WHERE keyspace_name=%s AND table_name=%s",
                    [CASSANDRA_KEYSPACE, name],
                ))
                table_status[name] = bool(rows)
        return {
            "backend": "ok",
            "cassandra": health,
            "keyspace": bool(keyspace_rows),
            "tables": table_status,
            "datasetLoaded": bool(self.last_loaded_stats),
            "lastLoadedStats": self.last_loaded_stats,
        }

    def load_sample_data(self, seed: int = 42, size: str = "small") -> dict[str, Any]:
        self.initialize()
        session = self.connect()
        session.set_keyspace(CASSANDRA_KEYSPACE)
        events = generate_events(seed=seed, size=size)
        prepared = {
            "user": session.prepare(f"INSERT INTO events_by_user (user_id,event_date,event_time,event_id,event_type,service,device_id,status,amount,metadata) VALUES (?,?,?,?,?,?,?,?,?,?)"),
            "type": session.prepare(f"INSERT INTO events_by_type (event_type,event_date,event_time,event_id,user_id,service,device_id,status,amount,metadata) VALUES (?,?,?,?,?,?,?,?,?,?)"),
            "device": session.prepare(f"INSERT INTO events_by_device (device_id,event_date,event_time,event_id,user_id,event_type,service,status,amount,metadata) VALUES (?,?,?,?,?,?,?,?,?,?)"),
            "error": session.prepare(f"INSERT INTO errors_by_service (service,event_date,event_time,event_id,user_id,device_id,status,metadata) VALUES (?,?,?,?,?,?,?,?)"),
            "summary": session.prepare(f"INSERT INTO daily_user_activity (user_id,event_date,event_type,event_count,purchase_total,error_count) VALUES (?,?,?,?,?,?)"),
            "copy": session.prepare(f"INSERT INTO event_copies (event_id,table_name,user_id,event_date,event_time,event_type,service,device_id,status,amount,metadata) VALUES (?,?,?,?,?,?,?,?,?,?,?)"),
        }
        for event in events:
            self._insert_event(session, prepared, event)
        for row in summarize(events):
            session.execute(prepared["summary"], [
                row["user_id"], row["event_date"], row["event_type"], row["event_count"], row["purchase_total"], row["error_count"]
            ])
        self.last_loaded_stats = stats_for(events) | {"seed": seed, "size": size}
        return self.last_loaded_stats

    def _insert_event(self, session, prepared, event: Event):
        base = [event.event_date, event.event_time, event.event_id]
        session.execute(prepared["user"], [event.user_id, *base, event.event_type, event.service, event.device_id, event.status, event.amount, event.metadata])
        session.execute(prepared["type"], [event.event_type, *base, event.user_id, event.service, event.device_id, event.status, event.amount, event.metadata])
        session.execute(prepared["device"], [event.device_id, *base, event.user_id, event.event_type, event.service, event.status, event.amount, event.metadata])
        for table in ["events_by_user", "events_by_type", "events_by_device"]:
            session.execute(prepared["copy"], [event.event_id, table, event.user_id, event.event_date, event.event_time, event.event_type, event.service, event.device_id, event.status, event.amount, event.metadata])
        if event.event_type == "error" or event.status == "failed":
            session.execute(prepared["error"], [event.service, *base, event.user_id, event.device_id, event.status, event.metadata])
            session.execute(prepared["copy"], [event.event_id, "errors_by_service", event.user_id, event.event_date, event.event_time, event.event_type, event.service, event.device_id, event.status, event.amount, event.metadata])

    def query(self, cql: str, params: list[Any], limit: int = DEFAULT_LIMIT) -> tuple[list[dict], float]:
        started = time.perf_counter()
        rows = list(self.connect().execute(cql, params))
        return [serialize_row(row) for row in rows[: min(limit, MAX_LIMIT)]], round((time.perf_counter() - started) * 1000, 2)

    def count_table(self, table: str) -> int:
        if table not in TABLES:
            raise ValueError("Unknown table")
        row = self.connect().execute(f"SELECT count(*) AS count FROM {CASSANDRA_KEYSPACE}.{table}").one()
        return int(row["count"])


def serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    out = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            out[key] = value.isoformat()
        elif isinstance(value, Decimal):
            out[key] = str(value)
        else:
            out[key] = str(value) if value.__class__.__name__ == "UUID" else value
    return out


store = CassandraStore()
