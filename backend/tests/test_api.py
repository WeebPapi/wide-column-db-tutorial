from datetime import date

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


class FakeStore:
    def health(self):
        return {"connected": True, "version": "test", "error": None}

    def status(self):
        return {"backend": "ok", "cassandra": self.health(), "keyspace": False, "tables": {}, "datasetLoaded": False}

    def initialize(self):
        return {"ok": True, "tables": ["events_by_user"]}

    def query(self, cql, params, limit=25):
        return ([{"user_id": params[0], "event_date": str(params[1]), "event_type": "login"}], 1.23)


def test_health_endpoint(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "store", FakeStore())
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["backend"] == "ok"


def test_initialize_endpoint(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "store", FakeStore())
    res = client.post("/api/database/initialize")
    assert res.status_code == 200
    assert res.json()["ok"] is True


def test_user_query_validation_and_prepared_path(monkeypatch):
    import app.main as main

    monkeypatch.setattr(main, "store", FakeStore())
    res = client.get("/api/events/by-user", params={"userId": "user_001", "eventDate": date.today().isoformat(), "limit": 10})
    assert res.status_code == 200
    assert res.json()["table"] == "events_by_user"
    assert res.json()["rows"][0]["user_id"] == "user_001"


def test_sandbox_rejects_write():
    res = client.post("/api/query/read-only", json={"cql": "DROP TABLE events_by_user"})
    assert res.status_code == 400
