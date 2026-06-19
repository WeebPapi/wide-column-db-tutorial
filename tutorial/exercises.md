# Tutorial Exercises

1. Use `cqlsh` to create the `activity_tracking` keyspace.
2. Use `cqlsh` to load `cassandra/02_schema.cql`.
3. Load the deterministic dataset with the provided `curl` command.
4. Run a user-event query for `user_001` and identify the full partition key.
5. Run an event-type query for `purchase` and explain why this requires a separate table.
6. Explain why the unsupported global purchase query is not solved by `ALLOW FILTERING`.
7. Design `purchases_by_device` for latest purchase events by device and day.
8. Use the GenAI prompt in the app, then critique the returned schema with the checklist.
