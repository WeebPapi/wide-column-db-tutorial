CREATE KEYSPACE IF NOT EXISTS activity_tracking
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
