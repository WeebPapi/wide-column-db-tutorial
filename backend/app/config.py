import os

CASSANDRA_HOSTS = [h.strip() for h in os.getenv("CASSANDRA_HOSTS", "cassandra").split(",") if h.strip()]
CASSANDRA_PORT = int(os.getenv("CASSANDRA_PORT", "9042"))
CASSANDRA_KEYSPACE = os.getenv("CASSANDRA_KEYSPACE", "activity_tracking")
DEFAULT_LIMIT = 25
MAX_LIMIT = 200
