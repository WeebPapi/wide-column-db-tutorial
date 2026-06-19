export type LabStep = {
  title: string;
  goal: string;
  explanation: string;
  commands?: string[];
  cql?: string[];
  expected: string;
  check?: string;
};

export const projectTopic = "Campus Shop Clickstream";

export const demoActions = [
  { type: "login", label: "Login", service: "auth", device: "device_03", tableCopies: ["events_by_user", "events_by_type", "events_by_device"] },
  { type: "page_view", label: "View product", service: "catalog", device: "device_03", tableCopies: ["events_by_user", "events_by_type", "events_by_device"] },
  { type: "search", label: "Search", service: "search", device: "device_07", tableCopies: ["events_by_user", "events_by_type", "events_by_device"] },
  { type: "purchase", label: "Purchase", service: "checkout", device: "device_07", tableCopies: ["events_by_user", "events_by_type", "events_by_device"] },
  { type: "error", label: "Checkout error", service: "checkout", device: "device_07", tableCopies: ["events_by_user", "events_by_type", "events_by_device", "errors_by_service"] }
];

export const demoTables = [
  { name: "events_by_user", key: "(user_id, event_date)", query: "User history for a day" },
  { name: "events_by_type", key: "(event_type, event_date)", query: "Recent purchases/searches/errors by day" },
  { name: "events_by_device", key: "(device_id, event_date)", query: "Device activity for a day" },
  { name: "errors_by_service", key: "(service, event_date)", query: "Service errors for a day" }
];

export const tutorialSteps: LabStep[] = [
  {
    title: "Start Docker",
    goal: "Start the local stack.",
    explanation: "Run Cassandra, the backend helper API, and this guide.",
    commands: ["docker compose up --build"],
    expected: "The frontend opens at http://localhost:3000. Cassandra may take 60-90 seconds."
  },
  {
    title: "Check Cassandra",
    goal: "Confirm cqlsh can reach Cassandra.",
    explanation: "Do this before creating schema.",
    commands: [
      "docker compose ps",
      "docker compose exec cassandra cqlsh -e \"DESCRIBE KEYSPACES\""
    ],
    expected: "You see system keyspaces such as system and system_schema.",
    check: "If it fails, wait 30 seconds and retry."
  },
  {
    title: "Create keyspace",
    goal: "Create the Cassandra namespace.",
    explanation: "A keyspace is where Cassandra stores related tables.",
    commands: [
      "docker compose exec cassandra cqlsh",
      "SOURCE '/workspace/cassandra/01_keyspace.cql';"
    ],
    cql: ["CREATE KEYSPACE IF NOT EXISTS activity_tracking\nWITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};"],
    expected: "`activity_tracking` exists."
  },
  {
    title: "Create tables",
    goal: "Create query-first tables.",
    explanation: "Each table supports one predictable clickstream query.",
    commands: [
      "docker compose exec cassandra cqlsh -f /workspace/cassandra/02_schema.cql",
      "docker compose exec cassandra cqlsh -k activity_tracking -e \"DESCRIBE TABLES\""
    ],
    expected: "You see events_by_user, events_by_type, events_by_device, errors_by_service, daily_user_activity, and event_copies."
  },
  {
    title: "Inspect primary key",
    goal: "Understand the main query table.",
    explanation: "User history is read by user and day, newest first.",
    cql: ["PRIMARY KEY ((user_id, event_date), event_time, event_id)\nWITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);"],
    expected: "Partition key: user_id + event_date. Clustering: event_time + event_id."
  },
  {
    title: "Load sample data",
    goal: "Generate fictional deterministic clickstream rows.",
    explanation: "Use the backend helper to write repeatable rows into Cassandra.",
    commands: [
      "curl -X POST http://localhost:8000/api/data/load -H \"Content-Type: application/json\" -d \"{\\\"seed\\\":42,\\\"size\\\":\\\"small\\\"}\"",
      "docker compose exec cassandra cqlsh -k activity_tracking -e \"SELECT count(*) FROM events_by_user;\""
    ],
    expected: "The count is greater than zero. Note one loaded date from the JSON response."
  },
  {
    title: "Query user history",
    goal: "Read one user's activity for one day.",
    explanation: "This supplies the full partition key.",
    commands: ["docker compose exec cassandra cqlsh -k activity_tracking"],
    cql: ["SELECT user_id, event_date, event_time, event_type, service, device_id\nFROM events_by_user\nWHERE user_id = 'user_001'\n  AND event_date = '<loaded date>'\nLIMIT 10;"],
    expected: "Rows return newest first."
  },
  {
    title: "Query purchases",
    goal: "Use the duplicated event-type table.",
    explanation: "Same logical events, different access pattern.",
    cql: ["SELECT event_type, event_date, event_time, user_id, amount\nFROM events_by_type\nWHERE event_type = 'purchase'\n  AND event_date = '<loaded date>'\nLIMIT 10;"],
    expected: "Purchase rows return without scanning users."
  },
  {
    title: "Query checkout errors",
    goal: "Troubleshoot a service.",
    explanation: "Errors get a service-oriented table.",
    cql: ["SELECT service, event_date, event_time, user_id, device_id, status\nFROM errors_by_service\nWHERE service = 'checkout'\n  AND event_date = '<loaded date>'\nLIMIT 10;"],
    expected: "Checkout error rows return for one service/day partition."
  },
  {
    title: "Bad query",
    goal: "See what Cassandra is not for.",
    explanation: "Global flexible reporting does not fit this schema.",
    cql: ["-- Anti-pattern:\nSELECT * FROM events_by_type\nWHERE event_type = 'purchase' AND amount > 100\nALLOW FILTERING;"],
    expected: "This is a scan/filter problem. Use a new table, analytics system, or SQL database."
  },
  {
    title: "Design a table",
    goal: "Model latest purchases for one device and day.",
    explanation: "New predictable query, new table.",
    cql: ["CREATE TABLE purchases_by_device (\n  device_id text,\n  event_date date,\n  event_time timestamp,\n  event_id uuid,\n  user_id text,\n  amount decimal,\n  metadata text,\n  PRIMARY KEY ((device_id, event_date), event_time, event_id)\n) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);"],
    expected: "Partition key: device_id + event_date. Clustering order: newest first."
  },
  {
    title: "GenAI critique",
    goal: "Ask AI, then verify the design.",
    explanation: "Use AI as a reviewer, not an oracle.",
    cql: ["Checklist:\n- Full partition key?\n- Date bucket included?\n- Newest-first clustering?\n- No ALLOW FILTERING?\n- Hotspot risk considered?"],
    expected: "A good answer supports the exact query and explains the trade-offs."
  }
];

export const sqlComparison = {
  cassandra: `SELECT *
FROM events_by_user
WHERE user_id = 'user_001'
  AND event_date = '<loaded date>';`,
  sql: `SELECT *
FROM events
WHERE user_id = 'user_001'
  AND event_time >= '<start>'
ORDER BY event_time DESC;`
};
