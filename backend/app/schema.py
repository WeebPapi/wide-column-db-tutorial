from .config import CASSANDRA_KEYSPACE

KEYSPACE_CQL = f"""
CREATE KEYSPACE IF NOT EXISTS {CASSANDRA_KEYSPACE}
WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}};
"""

TABLES = {
    "events_by_user": f"""
        CREATE TABLE IF NOT EXISTS {CASSANDRA_KEYSPACE}.events_by_user (
            user_id text,
            event_date date,
            event_time timestamp,
            event_id uuid,
            event_type text,
            service text,
            device_id text,
            status text,
            amount decimal,
            metadata text,
            PRIMARY KEY ((user_id, event_date), event_time, event_id)
        ) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);
    """,
    "events_by_type": f"""
        CREATE TABLE IF NOT EXISTS {CASSANDRA_KEYSPACE}.events_by_type (
            event_type text,
            event_date date,
            event_time timestamp,
            event_id uuid,
            user_id text,
            service text,
            device_id text,
            status text,
            amount decimal,
            metadata text,
            PRIMARY KEY ((event_type, event_date), event_time, event_id)
        ) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);
    """,
    "errors_by_service": f"""
        CREATE TABLE IF NOT EXISTS {CASSANDRA_KEYSPACE}.errors_by_service (
            service text,
            event_date date,
            event_time timestamp,
            event_id uuid,
            user_id text,
            device_id text,
            status text,
            metadata text,
            PRIMARY KEY ((service, event_date), event_time, event_id)
        ) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);
    """,
    "events_by_device": f"""
        CREATE TABLE IF NOT EXISTS {CASSANDRA_KEYSPACE}.events_by_device (
            device_id text,
            event_date date,
            event_time timestamp,
            event_id uuid,
            user_id text,
            event_type text,
            service text,
            status text,
            amount decimal,
            metadata text,
            PRIMARY KEY ((device_id, event_date), event_time, event_id)
        ) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);
    """,
    "daily_user_activity": f"""
        CREATE TABLE IF NOT EXISTS {CASSANDRA_KEYSPACE}.daily_user_activity (
            user_id text,
            event_date date,
            event_type text,
            event_count int,
            purchase_total decimal,
            error_count int,
            PRIMARY KEY (user_id, event_date, event_type)
        );
    """,
    "event_copies": f"""
        CREATE TABLE IF NOT EXISTS {CASSANDRA_KEYSPACE}.event_copies (
            event_id uuid,
            table_name text,
            user_id text,
            event_date date,
            event_time timestamp,
            event_type text,
            service text,
            device_id text,
            status text,
            amount decimal,
            metadata text,
            PRIMARY KEY (event_id, table_name)
        );
    """,
}

DROP_TABLES_CQL = [f"DROP TABLE IF EXISTS {CASSANDRA_KEYSPACE}.{name};" for name in TABLES]

SCHEMA_METADATA = [
    {
        "name": "events_by_user",
        "purpose": "Latest events for one user on one day.",
        "supportedQuery": "Get one user's events for a selected day, newest first.",
        "partitionKey": ["user_id", "event_date"],
        "clusteringColumns": ["event_time DESC", "event_id"],
        "regularColumns": ["event_type", "service", "device_id", "status", "amount", "metadata"],
        "sampleRow": "user_001 | 2026-06-18 | 10:42:11 | page_view | web | device_03",
        "partitionShape": "One partition contains one user's events for one bounded calendar day.",
    },
    {
        "name": "events_by_type",
        "purpose": "Recent events for a type such as purchase or search.",
        "supportedQuery": "Get recent events of a selected type on a selected day.",
        "partitionKey": ["event_type", "event_date"],
        "clusteringColumns": ["event_time DESC", "event_id"],
        "regularColumns": ["user_id", "service", "device_id", "status", "amount", "metadata"],
        "sampleRow": "purchase | 2026-06-18 | 11:01:04 | user_012 | device_07 | 79.90",
        "partitionShape": "One partition contains all events of one type for one day.",
    },
    {
        "name": "errors_by_service",
        "purpose": "Operational troubleshooting for recent errors.",
        "supportedQuery": "Get recent errors for one service on one day.",
        "partitionKey": ["service", "event_date"],
        "clusteringColumns": ["event_time DESC", "event_id"],
        "regularColumns": ["user_id", "device_id", "status", "metadata"],
        "sampleRow": "checkout | 2026-06-18 | 12:31:20 | user_022 | device_04 | HTTP 503",
        "partitionShape": "One partition contains error events for a service and day.",
    },
    {
        "name": "events_by_device",
        "purpose": "Device history and repeated activity.",
        "supportedQuery": "Get recent events for one device on one day.",
        "partitionKey": ["device_id", "event_date"],
        "clusteringColumns": ["event_time DESC", "event_id"],
        "regularColumns": ["user_id", "event_type", "service", "status", "amount", "metadata"],
        "sampleRow": "device_03 | 2026-06-18 | 08:15:03 | user_004 | api_request",
        "partitionShape": "One partition contains one device's events for one bounded day.",
    },
    {
        "name": "daily_user_activity",
        "purpose": "Precomputed daily activity summaries.",
        "supportedQuery": "Get a user's daily counts by event type.",
        "partitionKey": ["user_id"],
        "clusteringColumns": ["event_date", "event_type"],
        "regularColumns": ["event_count", "purchase_total", "error_count"],
        "sampleRow": "user_001 | 2026-06-18 | purchase | 3 | 149.70 | 0",
        "partitionShape": "One partition contains summary rows for one user across days.",
    },
]
