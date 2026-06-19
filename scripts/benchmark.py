import json
import urllib.request

payload = json.dumps({"seed": 99, "size": "small"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/benchmark/run", data=payload, headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=180) as res:
    print(json.dumps(json.loads(res.read().decode("utf-8")), indent=2))
