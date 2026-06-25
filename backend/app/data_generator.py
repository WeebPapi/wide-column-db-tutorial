from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
import random
import uuid


EVENT_TYPES = ["login", "page_view", "search", "purchase", "error", "api_request", "device_activity"]
SERVICES = ["auth", "catalog", "search", "checkout", "recommendations", "mobile-api"]
STATUSES = ["ok", "ok", "ok", "ok", "slow", "failed"]


@dataclass(frozen=True)
class Event:
    event_id: uuid.UUID
    user_id: str
    device_id: str
    event_type: str
    event_date: date
    event_time: datetime
    service: str
    status: str
    amount: Decimal | None
    metadata: str

    def api_dict(self):
        row = asdict(self)
        row["event_id"] = str(self.event_id)
        row["event_date"] = self.event_date.isoformat()
        row["event_time"] = self.event_time.isoformat()
        row["amount"] = str(self.amount) if self.amount is not None else None
        return row


def _event_id(seed: int, idx: int) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"wide-column-demo-{seed}-{idx}")


def generate_events(seed: int = 42, size: str = "small") -> list[Event]:
    rng = random.Random(seed)
    days = 4 if size == "small" else 8
    users = 50 if size == "small" else 180
    per_user_day = 7 if size == "small" else 18
    start = date(2026, 1, 15) - timedelta(days=days - 1)
    events: list[Event] = []
    idx = 0

    for day_offset in range(days):
        event_day = start + timedelta(days=day_offset)
        for user_no in range(1, users + 1):
            user_id = f"user_{user_no:03d}"
            device_id = f"device_{((user_no + day_offset) % 12) + 1:02d}"
            burst = 4 if user_no % 10 == 0 else 0
            for n in range(per_user_day + burst):
                weighted_type = rng.choices(
                    EVENT_TYPES,
                    weights=[10, 30, 18, 8, 7, 20, 7],
                    k=1,
                )[0]
                service = rng.choice(SERVICES)
                status = "failed" if weighted_type == "error" else rng.choice(STATUSES)
                second = rng.randint(0, 86399)
                event_time = datetime.combine(event_day, time.min) + timedelta(seconds=second)
                amount = None
                if weighted_type == "purchase":
                    amount = Decimal(f"{rng.randint(800, 18000) / 100:.2f}")
                    service = "checkout"
                metadata = f"screen={rng.choice(['home','product','cart','profile','search'])}; source=demo_seed_{seed}"
                events.append(
                    Event(
                        event_id=_event_id(seed, idx),
                        user_id=user_id,
                        device_id=device_id,
                        event_type=weighted_type,
                        event_date=event_day,
                        event_time=event_time,
                        service=service,
                        status=status,
                        amount=amount,
                        metadata=metadata,
                    )
                )
                idx += 1
    return sorted(events, key=lambda e: (e.event_date, e.event_time, e.event_id))


def summarize(events: list[Event]) -> list[dict]:
    grouped = defaultdict(lambda: {"event_count": 0, "purchase_total": Decimal("0.00"), "error_count": 0})
    for event in events:
        key = (event.user_id, event.event_date, event.event_type)
        grouped[key]["event_count"] += 1
        if event.amount is not None:
            grouped[key]["purchase_total"] += event.amount
        if event.event_type == "error" or event.status == "failed":
            grouped[key]["error_count"] += 1
    return [
        {
            "user_id": user_id,
            "event_date": event_date,
            "event_type": event_type,
            **values,
        }
        for (user_id, event_date, event_type), values in grouped.items()
    ]


def stats_for(events: list[Event]) -> dict:
    by_type = defaultdict(int)
    by_service = defaultdict(int)
    dates = set()
    users = set()
    devices = set()
    for event in events:
        by_type[event.event_type] += 1
        by_service[event.service] += 1
        dates.add(event.event_date.isoformat())
        users.add(event.user_id)
        devices.add(event.device_id)
    return {
        "events": len(events),
        "users": len(users),
        "devices": len(devices),
        "days": sorted(dates),
        "eventTypes": dict(sorted(by_type.items())),
        "services": dict(sorted(by_service.items())),
    }
