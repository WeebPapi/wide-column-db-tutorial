import pytest

from app.validation import validate_purchase_table_design, validate_read_only_cql


def test_read_only_query_allows_select_and_adds_limit():
    cql = validate_read_only_cql("SELECT * FROM events_by_user WHERE user_id='user_001'")
    assert cql.endswith("LIMIT 50")


@pytest.mark.parametrize("cql", [
    "DROP TABLE events_by_user",
    "SELECT * FROM events_by_user ALLOW FILTERING",
    "DELETE FROM events_by_user WHERE user_id='x'",
])
def test_read_only_query_blocks_dangerous_cql(cql):
    with pytest.raises(ValueError):
        validate_read_only_cql(cql)


def test_design_validation_accepts_expected_model():
    result = validate_purchase_table_design(["device_id", "event_date"], ["event_time", "event_id"], "DESC")
    assert result["valid"] is True


def test_design_validation_rejects_unbounded_partition():
    result = validate_purchase_table_design(["device_id"], ["event_time"], "ASC")
    assert result["valid"] is False
