import json
import urllib.request

payload = json.dumps({"seed": 42, "size": "small"}).encode("utf-8")
req = urllib.request.Request("http://localhost:8000/api/data/load", data=payload, headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=120) as res:
    print(res.read().decode("utf-8"))
