# Wide-Column Databases Final Project - Demo & Tutorial Runbook

## Start Docker

```bash
git clone <repo-url>
cd wide-column-db-final-project
docker compose up --build
```

Open `http://localhost:3000`. The website is the guide, not a replacement for the terminal.

## Opening script

"Today we are modelling a campus shop clickstream in Cassandra. You will run the database commands yourselves, and the website will guide each step."

## Presenter Mode flow

1. Start Docker and check Cassandra
   - Say: "Cassandra takes a moment to start. We verify it using cqlsh, not just the website."
   - Expected result: `DESCRIBE KEYSPACES` returns system keyspaces.
2. Create keyspace
   - Say: "A keyspace is Cassandra's namespace and replication configuration."
   - Expected result: `activity_tracking` exists.
3. Create tables
   - Say: "Each table exists for one known read path."
   - Expected result: `DESCRIBE TABLES` lists the tutorial tables.
4. Load demo data
   - Say: "We use a helper endpoint to generate repeatable fictional rows, then inspect them with CQL."
   - Expected result: row counts are greater than zero.
5. Schema explorer
   - Say: "Each table shows a supported query, partition key, clustering columns, and regular columns."
   - Expected result: students can identify `events_by_user`.
6. Run latest events for a user
   - Say: "This query supplies the full partition key: user and date."
   - Expected result: newest events appear with execution duration.
7. Run events by type
   - Say: "This is the same logical data duplicated into another table for another read path."
   - Expected result: purchase or search rows appear.
8. Run errors by service
   - Say: "Operational troubleshooting gets a table shaped for service and day."
   - Expected result: error rows appear for the selected service.
9. Unsupported query
   - Say: "Global purchases over EUR 100 ordered by amount do not match any partition key."
   - Expected result: students see why `ALLOW FILTERING` is a warning sign.
10. Design a new table
    - Say: "A new predictable query often means a new table."
    - Expected result: `(device_id, event_date)` and `event_time DESC` validate.
11. SQL comparison
    - Say: "SQL is stronger for flexible reporting and joins; Cassandra is strong for predictable distributed reads and writes."
    - Expected result: students can name one strength of each.
12. Benchmark
    - Say: "These numbers are measured locally and are not production claims."
    - Expected result: local insert and lookup measurements appear.

## Two-hour Tutorial Mode timeline

- 0:00-0:10: Start Docker and open the app.
- 0:10-0:20: Cassandra and wide-column concepts.
- 0:20-0:35: Create keyspace and schema.
- 0:35-0:45: Load data and verify row counts.
- 0:45-1:05: Run user, type, error, and device queries in cqlsh.
- 1:05-1:20: Partition key and clustering exercises.
- 1:20-1:35: Denormalization and unsupported query challenge.
- 1:35-1:50: Design a new table and use GenAI.
- 1:50-2:00: SQL comparison, summary, and feedback.

## Exact student tasks

- Mark each sidebar step complete after running the command.
- Create the keyspace and tables from the provided CQL files.
- Load the small dataset with seed `42`.
- Run `events_by_user` for `user_001` in cqlsh.
- Run `events_by_type` for `purchase`.
- Run `errors_by_service` for `checkout`.
- Run `events_by_device` for `device_03`.
- Copy one `event_id` into the denormalization explorer.
- Complete the unsupported-query challenge.
- Validate the `purchases_by_device` design.
- Paste an AI-generated table into the GenAI exercise and critique it.

## Checkpoints

- Can you name the full partition key for `events_by_user`?
- Why is `event_date` included?
- What does `event_time DESC` do?
- Why do we duplicate events across tables?
- When would SQL be a better fit?

## Exercises

Use `tutorial/exercises.md` and `tutorial/solutions.md`.

## GenAI activity

Students copy the prompt from the GenAI page into an AI assistant, paste the answer back, and evaluate it with the checklist. The goal is critique, not blind acceptance.

## SQL comparison

Use the web page and `relational-comparison/equivalent_queries.sql` to compare normalized SQL with Cassandra query tables.

## Troubleshooting roles

- Person 1: keep discussion moving and explain concepts while tools start.
- Person 2: help students identify keys and query shapes.
- Person 3: watch Docker logs, reset data, and help with local setup.

## Cleanup

```bash
docker compose down
```

To delete Cassandra data:

```bash
docker compose down -v
```

## Closing script

"Cassandra is powerful when the access patterns are known and high-volume. The trade-off is that you must model queries up front, duplicate data, and avoid pretending it is an ad hoc relational reporting engine."
