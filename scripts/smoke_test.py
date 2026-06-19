import json
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=20) as res:
        return json.loads(res.read().decode("utf-8"))


def post(path, body=None):
    data = json.dumps(body or {}).encode("utf-8")
    req = urllib.request.Request(BASE + path, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=180) as res:
        return json.loads(res.read().decode("utf-8"))


def wait_for_backend():
    for _ in range(60):
        try:
            health = get("/api/health")
            if health["backend"] == "ok":
                return health
        except urllib.error.URLError:
            pass
        time.sleep(2)
    raise RuntimeError("Backend did not become ready")


def main():
    print("1. Waiting for backend...")
    print(wait_for_backend())
    print("2. Initializing schema...")
    print(post("/api/database/initialize"))
    print("3. Loading sample data...")
    stats = post("/api/data/load", {"seed": 42, "size": "small"})
    print(stats)
    day = stats["days"][-1]
    print("4. Querying known partition...")
    result = get(f"/api/events/by-user?userId=user_001&eventDate={day}&limit=10")
    if not result["rows"]:
        raise RuntimeError("Known query returned no rows")
    print(f"Smoke test passed with {len(result['rows'])} rows.")


if __name__ == "__main__":
    main()
