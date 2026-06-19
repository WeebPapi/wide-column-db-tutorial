CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL
);

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL
);

CREATE TABLE events (
  event_id UUID PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  device_id TEXT REFERENCES devices(id),
  event_type TEXT NOT NULL,
  event_time TIMESTAMP NOT NULL,
  service TEXT,
  status TEXT,
  amount NUMERIC,
  metadata TEXT
);

CREATE INDEX events_user_time_idx ON events (user_id, event_time DESC);
CREATE INDEX events_type_time_idx ON events (event_type, event_time DESC);
