import re

ALLOWED_TABLES = {
    "events_by_user",
    "events_by_type",
    "errors_by_service",
    "events_by_device",
    "daily_user_activity",
    "event_copies",
}


def validate_read_only_cql(cql: str) -> str:
    cleaned = cql.strip()
    lowered = cleaned.lower()
    if not lowered.startswith("select "):
        raise ValueError("Only SELECT queries are allowed in the educational sandbox.")
    if ";" in cleaned[:-1] or lowered.count(";") > 1:
        raise ValueError("Only one SELECT statement may be executed.")
    dangerous = ["insert ", "update ", "delete ", "drop ", "truncate ", "alter ", "create ", "grant ", "allow filtering"]
    if any(token in lowered for token in dangerous):
        raise ValueError("This query is blocked. Use prepared demo actions for schema changes, and avoid ALLOW FILTERING.")
    referenced = re.findall(r"\bfrom\s+([a-zA-Z_][\w.]*)", lowered)
    if not referenced:
        raise ValueError("The query must include a FROM table.")
    table = referenced[0].split(".")[-1]
    if table not in ALLOWED_TABLES:
        raise ValueError(f"Table '{table}' is not part of this tutorial schema.")
    if " limit " not in lowered:
        cleaned = cleaned.rstrip(";") + " LIMIT 50"
    return cleaned.rstrip(";")


def validate_purchase_table_design(partition_keys: list[str], clustering_columns: list[str], clustering_order: str) -> dict:
    normalized_pk = [p.strip() for p in partition_keys]
    normalized_cc = [c.strip() for c in clustering_columns]
    messages = []
    score = 0
    if set(normalized_pk) == {"device_id", "event_date"}:
        score += 2
        messages.append("Good: the full query key is device plus day, which bounds the partition.")
    else:
        messages.append("Partition key should include device_id and event_date for this exact query.")
    if normalized_cc[:1] == ["event_time"] and "event_id" in normalized_cc:
        score += 2
        messages.append("Good: event_time orders rows and event_id makes the key unique.")
    else:
        messages.append("Use event_time first, with event_id as a tie-breaker clustering column.")
    if clustering_order.upper() == "DESC":
        score += 1
        messages.append("Good: DESC supports newest-first reads without client-side sorting.")
    else:
        messages.append("Use DESC clustering order for newest-first results.")
    return {"valid": score >= 5, "score": score, "messages": messages}
