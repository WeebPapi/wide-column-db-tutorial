export const steps = [
  "Welcome",
  "What is a wide-column database?",
  "Cassandra mental model",
  "Our event-tracking use case",
  "Explore the data model",
  "Initialize Cassandra",
  "Generate and load data",
  "Query events by user",
  "Query events by type",
  "Query errors by service",
  "Query activity by device",
  "Understand partition keys",
  "Understand clustering columns",
  "Understand denormalization",
  "Unsupported query challenge",
  "Design a new table",
  "Cassandra vs SQL",
  "GenAI exercise",
  "Mini challenge",
  "Summary and feedback"
];

export const presenterSteps = [
  ["System status", "Show the backend retrying until Cassandra is available.", "Cassandra startup is part of distributed systems reality."],
  ["Schema explorer", "Walk through events_by_user and events_by_type.", "Tables are built for access patterns."],
  ["Run user query", "Use user_001 and the latest loaded day.", "Full partition key makes the read predictable."],
  ["Run type query", "Show purchases or searches by day.", "Duplicated data supports another fast query."],
  ["Run errors query", "Filter by service and day.", "Operational reads get their own table."],
  ["Denormalization", "Pick an event id from results and show copies.", "Cassandra trades write duplication for read speed."],
  ["Unsupported query", "Try global purchases over 100 euro.", "Cross-partition sorting is not a natural Cassandra query."],
  ["Design table", "Build purchases_by_device.", "New query often means new table."],
  ["SQL comparison", "Compare normalized SQL with CQL tables.", "Neither model wins everywhere."],
  ["Benchmark", "Run local benchmark with warning visible.", "Local single-node measurements are educational only."],
  ["Summary", "Recap strengths and weaknesses.", "Use Cassandra for predictable high-volume access patterns."]
];

export const tutorialTimeline = [
  ["0:00-0:10", "Start Docker and open the app", "Confirm backend and Cassandra status."],
  ["0:10-0:20", "Concepts", "Answer why query-first modelling matters."],
  ["0:20-0:35", "Schema", "Identify partition and clustering columns."],
  ["0:35-0:45", "Initialize/load", "Load deterministic sample data."],
  ["0:45-1:05", "Queries", "Run user, type, error, and device queries."],
  ["1:05-1:20", "Keys", "Explain what happens when a key part is missing."],
  ["1:20-1:35", "Denormalization", "Find copies of one logical event."],
  ["1:35-1:50", "Design + GenAI", "Validate a new table and critique AI output."],
  ["1:50-2:00", "Comparison", "Summarize when SQL is the better choice."]
];

export const sqlComparison = {
  cassandra: `CREATE TABLE events_by_user (
  user_id text,
  event_date date,
  event_time timestamp,
  event_id uuid,
  event_type text,
  service text,
  device_id text,
  amount decimal,
  PRIMARY KEY ((user_id, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC);`,
  sql: `CREATE TABLE events (
  event_id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  device_id TEXT REFERENCES devices(id),
  event_type TEXT,
  event_time TIMESTAMP,
  amount NUMERIC
);

SELECT *
FROM events
WHERE user_id = ?
  AND event_time >= ?
ORDER BY event_time DESC;`
};
