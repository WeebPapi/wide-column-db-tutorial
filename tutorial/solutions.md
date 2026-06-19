# Tutorial Solutions

1. `events_by_user` uses partition key `(user_id, event_date)`.
2. `events_by_type` duplicates event rows so reads by `event_type` and `event_date` are partition-local.
3. Normal events appear in `events_by_user`, `events_by_type`, and `events_by_device`. Error events also appear in `errors_by_service`.
4. `ALLOW FILTERING` would ask Cassandra to scan data that was not modelled for the query.
5. Use partition key `(device_id, event_date)` and clustering columns `(event_time, event_id)` with `event_time DESC`.
6. A good AI answer includes the exact partition key, bounded date bucket, newest-first clustering order, and no filtering workaround.
