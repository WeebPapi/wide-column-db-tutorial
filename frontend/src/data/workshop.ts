export type LabStep = {
  title: string;
  goal: string;
  explanation: string;
  commands?: string[];
  cql?: string[];
  expected: string;
  check?: string;
  discussion?: string;
};

export const projectTopic = "Campus Shop Clickstream: modelling user activity history with Apache Cassandra";

export const steps: LabStep[] = [
  {
    title: "Start the lab",
    goal: "Run the local Cassandra tutorial stack.",
    explanation: "The website is your guide, but Cassandra work happens in your terminal. You will start Docker, open this page, and then use cqlsh and small helper endpoints to inspect the database.",
    commands: ["docker compose up --build", "open http://localhost:3000"],
    expected: "The frontend opens. Cassandra may still be warming up for 60-90 seconds.",
    check: "Open a second terminal for the remaining commands."
  },
  {
    title: "Check Cassandra",
    goal: "Confirm that Cassandra is accepting CQL commands.",
    explanation: "Cassandra starts slower than the frontend. This is normal for a database node. We check readiness before creating tables.",
    commands: [
      "docker compose ps",
      "docker compose exec cassandra cqlsh -e \"DESCRIBE KEYSPACES\""
    ],
    expected: "You should see system keyspaces such as system, system_schema, and system_auth.",
    check: "If cqlsh cannot connect yet, wait 30 seconds and run the command again."
  },
  {
    title: "Create the keyspace",
    goal: "Create one local keyspace for the tutorial.",
    explanation: "A keyspace is Cassandra's top-level namespace. In production it also defines replication. Here we use one replica because this is a single-node classroom setup.",
    cql: [
      "CREATE KEYSPACE IF NOT EXISTS activity_tracking\nWITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};",
      "DESCRIBE KEYSPACES;"
    ],
    commands: [
      "docker compose exec cassandra cqlsh",
      "SOURCE '/workspace/cassandra/01_keyspace.cql';"
    ],
    expected: "The keyspace activity_tracking exists.",
    discussion: "Production Cassandra would usually use NetworkTopologyStrategy and multiple nodes."
  },
  {
    title: "Create query tables",
    goal: "Create tables for known clickstream questions.",
    explanation: "Our topic is not generic event storage. It is a campus shop clickstream: logins, page views, searches, purchases, API calls, and errors from a student shopping app.",
    commands: ["docker compose exec cassandra cqlsh -f /workspace/cassandra/02_schema.cql"],
    expected: "Cassandra creates events_by_user, events_by_type, errors_by_service, events_by_device, daily_user_activity, and event_copies.",
    check: "Run: docker compose exec cassandra cqlsh -k activity_tracking -e \"DESCRIBE TABLES\""
  },
  {
    title: "Read one table",
    goal: "Understand the primary key before loading data.",
    explanation: "Cassandra modelling starts with the query. For user history, the application asks: show one user's events on one day, newest first.",
    cql: [
      "CREATE TABLE events_by_user (\n  user_id text,\n  event_date date,\n  event_time timestamp,\n  event_id uuid,\n  event_type text,\n  service text,\n  device_id text,\n  status text,\n  amount decimal,\n  metadata text,\n  PRIMARY KEY ((user_id, event_date), event_time, event_id)\n) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);"
    ],
    expected: "Partition key: user_id plus event_date. Clustering columns: event_time and event_id.",
    discussion: "The date bucket keeps one user's partition from growing forever."
  },
  {
    title: "Generate sample rows",
    goal: "Load deterministic fictional data.",
    explanation: "Instead of typing hundreds of INSERT statements, the backend generates repeatable fictional clickstream events. Students still inspect and query the resulting Cassandra tables themselves.",
    commands: [
      "curl -X POST http://localhost:8000/api/data/load -H \"Content-Type: application/json\" -d \"{\\\"seed\\\":42,\\\"size\\\":\\\"small\\\"}\"",
      "docker compose exec cassandra cqlsh -k activity_tracking -e \"SELECT count(*) FROM events_by_user;\""
    ],
    expected: "The API returns dataset stats, and Cassandra row counts are greater than zero.",
    check: "The default small dataset has 50 users, 12 devices, and several days of events."
  },
  {
    title: "Query user history",
    goal: "Run the main Cassandra query by hand.",
    explanation: "This is Cassandra's happy path: the query supplies the full partition key, so Cassandra can go directly to one user's day bucket.",
    cql: [
      "SELECT user_id, event_date, event_time, event_type, service, device_id\nFROM events_by_user\nWHERE user_id = 'user_001'\n  AND event_date = '<use a loaded date>'\nLIMIT 10;"
    ],
    commands: ["docker compose exec cassandra cqlsh -k activity_tracking"],
    expected: "Rows come back ordered newest first within the selected user/day partition.",
    discussion: "If you omit event_date, Cassandra cannot identify the full partition."
  },
  {
    title: "Query by event type",
    goal: "See why Cassandra duplicates data.",
    explanation: "A query by event_type is a different access pattern. Instead of scanning events_by_user, we write the same logical events into events_by_type.",
    cql: [
      "SELECT event_type, event_date, event_time, user_id, amount\nFROM events_by_type\nWHERE event_type = 'purchase'\n  AND event_date = '<use a loaded date>'\nLIMIT 10;"
    ],
    expected: "Purchase rows are returned from a table designed specifically for type-and-day lookup.",
    discussion: "In Cassandra, denormalization is normal when it serves a known read path."
  },
  {
    title: "Query service errors",
    goal: "Troubleshoot one service's failures.",
    explanation: "The operations team wants recent checkout errors. That question gets a table keyed by service and day.",
    cql: [
      "SELECT service, event_date, event_time, user_id, device_id, status, metadata\nFROM errors_by_service\nWHERE service = 'checkout'\n  AND event_date = '<use a loaded date>'\nLIMIT 10;"
    ],
    expected: "Rows show failed or error events for the checkout service.",
    discussion: "This is useful for incident triage, but not for arbitrary global reporting."
  },
  {
    title: "Query device history",
    goal: "Look up recent activity from one device.",
    explanation: "A device support flow needs a different partition key: device_id plus event_date.",
    cql: [
      "SELECT device_id, event_date, event_time, user_id, event_type, service\nFROM events_by_device\nWHERE device_id = 'device_03'\n  AND event_date = '<use a loaded date>'\nLIMIT 10;"
    ],
    expected: "Rows show events for one device and one day.",
    discussion: "Again, the table exists because the application has this exact query."
  },
  {
    title: "Try a bad query",
    goal: "Learn what Cassandra does not naturally support.",
    explanation: "Now ask for every purchase over 100 EUR across every user and date, globally ordered by amount. This is intentionally not supported by the current model.",
    cql: [
      "-- Do not use this as a solution:\nSELECT * FROM events_by_type\nWHERE event_type = 'purchase' AND amount > 100\nALLOW FILTERING;"
    ],
    expected: "Students should explain why this is a scan/filter problem, not a partition lookup.",
    discussion: "A relational database or analytics store may be a better tool for flexible reporting."
  },
  {
    title: "Design one new table",
    goal: "Model latest purchases for a device on a day.",
    explanation: "A new predictable query often means a new Cassandra table. Here the query is: latest purchase events for a specific device and day.",
    cql: [
      "CREATE TABLE purchases_by_device (\n  device_id text,\n  event_date date,\n  event_time timestamp,\n  event_id uuid,\n  user_id text,\n  amount decimal,\n  metadata text,\n  PRIMARY KEY ((device_id, event_date), event_time, event_id)\n) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);"
    ],
    expected: "Partition key is device_id plus event_date; event_time DESC supports newest-first results.",
    check: "Explain why event_date belongs in the partition key."
  },
  {
    title: "Compare with SQL",
    goal: "Keep the trade-off fair.",
    explanation: "SQL is better for joins and flexible reporting. Cassandra is better here only because the clickstream queries are known and partition-friendly.",
    expected: "Students can name one Cassandra strength and one SQL strength.",
    discussion: "Do not present Cassandra as a replacement for all relational databases."
  },
  {
    title: "GenAI critique",
    goal: "Use AI as a reviewer, not an oracle.",
    explanation: "Ask an AI assistant to design the purchases_by_device table, then critique the answer using the checklist on this page.",
    expected: "A good answer avoids ALLOW FILTERING, includes event_date, and orders by event_time DESC.",
    check: "Could the AI explain partition size and hotspots?"
  },
  {
    title: "Wrap up",
    goal: "Summarize the lesson in one minute.",
    explanation: "Cassandra is useful when the application has high-volume writes and predictable reads. The cost is that the data model is less flexible and often duplicates data.",
    expected: "Final takeaway: design Cassandra tables from the query backwards."
  }
];

export const presenterSteps = [
  ["Person 1", "Introduce the campus shop clickstream and Cassandra basics.", "Keep this conceptual and short."],
  ["Person 2", "Walk through events_by_user and the first cqlsh query.", "Emphasize partition key and clustering order."],
  ["Person 3", "Guide Docker, cqlsh, data loading, and troubleshooting.", "Students should run commands themselves."],
  ["Group", "Discuss bad query and SQL comparison.", "Make the trade-off fair."]
];

export const tutorialTimeline = [
  ["0:00-0:10", "Start Docker and open the guide", "Everyone can run cqlsh."],
  ["0:10-0:25", "Topic and Cassandra basics", "Students can explain partition key."],
  ["0:25-0:45", "Create keyspace and schema", "Students inspect DESCRIBE TABLES."],
  ["0:45-1:05", "Load sample data", "Students verify row counts."],
  ["1:05-1:30", "Run four CQL queries", "Students identify the table used."],
  ["1:30-1:45", "Bad query and SQL comparison", "Students explain ALLOW FILTERING risk."],
  ["1:45-2:00", "Design exercise and GenAI critique", "Students justify a new primary key."]
];

export const sqlComparison = {
  cassandra: `-- Cassandra: one table for one known read path
SELECT *
FROM events_by_user
WHERE user_id = 'user_001'
  AND event_date = '2026-06-18'
LIMIT 10;`,
  sql: `-- SQL: flexible reporting is natural
SELECT *
FROM events
WHERE user_id = 'user_001'
  AND event_time >= '2026-06-18'
ORDER BY event_time DESC;`
};
