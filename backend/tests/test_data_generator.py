from app.data_generator import generate_events, stats_for


def test_generate_events_is_deterministic():
    first = generate_events(seed=7, size="small")
    second = generate_events(seed=7, size="small")
    assert [e.event_id for e in first[:20]] == [e.event_id for e in second[:20]]
    assert len(first) >= 50 * 4 * 7


def test_stats_include_event_types():
    stats = stats_for(generate_events(seed=3, size="small"))
    assert stats["events"] > 0
    assert stats["users"] == 50
    assert "purchase" in stats["eventTypes"]
