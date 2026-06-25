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
  { type: "page_view", label: "View product", service: "catalog", device: "device_03", extra: { label: "product_id", value: "hoodie_srh_01" }, tableCopies: ["events_by_user", "events_by_type", "events_by_device"] },
  { type: "search", label: "Search", service: "search", device: "device_07", extra: { label: "search_term", value: "coffee" }, tableCopies: ["events_by_user", "events_by_type", "events_by_device"] },
  { type: "purchase", label: "Purchase", service: "checkout", device: "device_07", extra: { label: "amount", value: "EUR 49.90" }, tableCopies: ["events_by_user", "events_by_type", "events_by_device"] },
  { type: "error", label: "Checkout error", service: "checkout", device: "device_07", extra: { label: "error_code", value: "PAYMENT_TIMEOUT" }, tableCopies: ["events_by_user", "events_by_type", "events_by_device", "errors_by_service"] }
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
    explanation: "Run the services we need: Cassandra stores the rows, the backend loads data, and this page gives the steps.",
    commands: ["docker compose up -d"],
    expected: "The frontend opens at http://localhost:3000. Cassandra may still be starting, so 60-90 seconds is normal."
  },
  {
    title: "Check Cassandra",
    goal: "Confirm cqlsh can reach Cassandra.",
    explanation: "Check the database is ready before creating tables. If Cassandra is still booting, schema commands can fail.",
    commands: [
      "docker compose ps",
      "docker compose exec cassandra cqlsh"
    ],
    cql: ["DESCRIBE KEYSPACES;"],
    expected: "You see system keyspaces such as system and system_schema. That means cqlsh can talk to Cassandra.",
    check: "If it fails, wait 30 seconds and retry."
  },
  {
    title: "Create keyspace",
    goal: "Create the Cassandra namespace.",
    explanation: "A keyspace is like a project folder for tables. Here, all clickstream tables live under activity_tracking.",
    cql: [
      "SOURCE '/workspace/cassandra/01_keyspace.cql';",
      "USE activity_tracking;",
      "CREATE KEYSPACE IF NOT EXISTS activity_tracking\nWITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};"
    ],
    expected: "`activity_tracking` exists. Later commands can now create tables inside it."
  },
  {
    title: "Create tables",
    goal: "Create query-first tables.",
    explanation: "Cassandra tables are designed around reads. For example, user history and purchase history need separate tables.",
    cql: [
      "SOURCE '/workspace/cassandra/02_schema.cql';",
      "USE activity_tracking;\nDESCRIBE TABLES;"
    ],
    expected: "You see events_by_user, events_by_type, events_by_device, errors_by_service, daily_user_activity, and event_copies."
  },
  {
    title: "Inspect primary key",
    goal: "Understand the main query table.",
    explanation: "This key groups one user's events for one day. Inside that group, rows are sorted newest first.",
    cql: ["PRIMARY KEY ((user_id, event_date), event_time, event_id)\nWITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);"],
    expected: "Partition key: user_id + event_date. Clustering: event_time + event_id. Example: user_001 on one date is one small group to read."
  },
  {
    title: "Load sample data",
    goal: "Generate fictional deterministic clickstream rows.",
    explanation: "Load fake campus shop events. This replaces old tutorial rows, then loads the same fixed dates for everyone.",
    commands: [
      "curl -X POST http://localhost:8000/api/data/load -H \"Content-Type: application/json\" -d \"{\\\"seed\\\":42,\\\"size\\\":\\\"small\\\"}\""
    ],
    cql: ["USE activity_tracking;\nSELECT count(*) FROM events_by_user;"],
    expected: "The count is greater than zero. The small dataset includes 2026-01-12 through 2026-01-15, so later queries use 2026-01-15."
  },
  {
    title: "Query user history",
    goal: "Read one user's activity for one day.",
    explanation: "This gives Cassandra the full partition key: which user and which day. That makes the read direct.",
    cql: ["USE activity_tracking;\nSELECT user_id, event_date, event_time, event_type, service, device_id\nFROM events_by_user\nWHERE user_id = 'user_001'\n  AND event_date = '2026-01-15'\nLIMIT 10;"],
    expected: "Rows return newest first. You should see actions like login, page_view, search, or purchase."
  },
  {
    title: "Query purchases",
    goal: "Use the duplicated event-type table.",
    explanation: "We use a copy of the event data because this question starts with event_type, not user_id.",
    cql: ["USE activity_tracking;\nSELECT event_type, event_date, event_time, user_id, amount\nFROM events_by_type\nWHERE event_type = 'purchase'\n  AND event_date = '2026-01-15'\nLIMIT 10;"],
    expected: "Purchase rows return without scanning every user. Cassandra reads the purchase/date group directly."
  },
  {
    title: "Query checkout errors",
    goal: "Troubleshoot a service.",
    explanation: "When debugging checkout, we start with service and date. This table matches that question.",
    cql: ["USE activity_tracking;\nSELECT service, event_date, event_time, user_id, device_id, status\nFROM errors_by_service\nWHERE service = 'checkout'\n  AND event_date = '2026-01-15'\nLIMIT 10;"],
    expected: "Checkout error rows return for one service/day partition, for example checkout errors on the loaded date."
  },
  {
    title: "Bad query",
    goal: "See what Cassandra is not for.",
    explanation: "This query asks Cassandra to filter after reading too much data. That is why ALLOW FILTERING is a warning sign.",
    cql: ["-- Anti-pattern:\nSELECT * FROM events_by_type\nWHERE event_type = 'purchase' AND amount > 100\nALLOW FILTERING;"],
    expected: "This is a scan/filter problem. Use a new table for this exact question, or use an analytics/SQL system."
  },
  {
    title: "Design a table",
    goal: "Model latest purchases for one device and day.",
    explanation: "The new question starts with device and day, so the table key should start there too.",
    cql: ["USE activity_tracking;\nCREATE TABLE purchases_by_device (\n  device_id text,\n  event_date date,\n  event_time timestamp,\n  event_id uuid,\n  user_id text,\n  amount decimal,\n  metadata text,\n  PRIMARY KEY ((device_id, event_date), event_time, event_id)\n) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);"],
    expected: "Partition key: device_id + event_date. Clustering order: newest first, so latest purchases appear first."
  },
  {
    title: "GenAI critique",
    goal: "Ask AI, then verify the design.",
    explanation: "AI can spot mistakes, but you still check the answer against Cassandra rules and your query.",
    cql: ["Checklist:\n- Full partition key?\n- Date bucket included?\n- Newest-first clustering?\n- No ALLOW FILTERING?\n- Hotspot risk considered?"],
    expected: "A good answer supports the exact query and explains trade-offs, like duplicated data or large partitions."
  }
];

export const sqlComparison = {
  cassandra: `SELECT *
FROM events_by_user
WHERE user_id = 'user_001'
  AND event_date = '2026-01-15';`,
  sql: `SELECT *
FROM events
WHERE user_id = 'user_001'
  AND event_time >= '<start>'
ORDER BY event_time DESC;`
};
