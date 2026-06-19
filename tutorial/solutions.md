# Tutorial Solutions

1. The keyspace command is in `cassandra/01_keyspace.cql`.
2. The schema command is `docker compose exec cassandra cqlsh -f /workspace/cassandra/02_schema.cql`.
3. The data-load command is the `curl -X POST http://localhost:8000/api/data/load ...` snippet in the guide.
4. `events_by_user` uses partition key `(user_id, event_date)`.
5. `events_by_type` duplicates event rows so reads by `event_type` and `event_date` are partition-local.
6. `ALLOW FILTERING` would ask Cassandra to scan data that was not modelled for the query.
7. Use partition key `(device_id, event_date)` and clustering columns `(event_time, event_id)` with `event_time DESC`.
8. A good AI answer includes the exact partition key, bounded date bucket, newest-first clustering order, and no filtering workaround.
