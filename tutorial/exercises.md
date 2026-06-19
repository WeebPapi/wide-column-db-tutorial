# Tutorial Exercises

1. Run a user-event query for `user_001` and identify the full partition key.
2. Run an event-type query for `purchase` and explain why this requires a separate table.
3. Paste one `event_id` into the denormalization explorer and list the tables containing that event.
4. Explain why the unsupported global purchase query is not solved by `ALLOW FILTERING`.
5. Design `purchases_by_device` for latest purchase events by device and day.
6. Use the GenAI prompt in the app, then critique the returned schema with the checklist.
