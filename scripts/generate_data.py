from pathlib import Path
import csv
import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))
from app.data_generator import generate_events


def main():
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 42
    size = sys.argv[2] if len(sys.argv) > 2 else "small"
    out = Path(__file__).resolve().parents[1] / "data" / "generated" / f"events_seed_{seed}_{size}.csv"
    events = generate_events(seed=seed, size=size)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(events[0].api_dict()))
        writer.writeheader()
        writer.writerows([event.api_dict() for event in events])
    print(f"Wrote {len(events)} events to {out}")


if __name__ == "__main__":
    main()
