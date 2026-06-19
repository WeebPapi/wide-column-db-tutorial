USE activity_tracking;

CREATE TABLE IF NOT EXISTS events_by_user (
  user_id text,
  event_date date,
  event_time timestamp,
  event_id uuid,
  event_type text,
  service text,
  device_id text,
  status text,
  amount decimal,
  metadata text,
  PRIMARY KEY ((user_id, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);

CREATE TABLE IF NOT EXISTS events_by_type (
  event_type text,
  event_date date,
  event_time timestamp,
  event_id uuid,
  user_id text,
  service text,
  device_id text,
  status text,
  amount decimal,
  metadata text,
  PRIMARY KEY ((event_type, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);

CREATE TABLE IF NOT EXISTS errors_by_service (
  service text,
  event_date date,
  event_time timestamp,
  event_id uuid,
  user_id text,
  device_id text,
  status text,
  metadata text,
  PRIMARY KEY ((service, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);

CREATE TABLE IF NOT EXISTS events_by_device (
  device_id text,
  event_date date,
  event_time timestamp,
  event_id uuid,
  user_id text,
  event_type text,
  service text,
  status text,
  amount decimal,
  metadata text,
  PRIMARY KEY ((device_id, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC, event_id ASC);

CREATE TABLE IF NOT EXISTS daily_user_activity (
  user_id text,
  event_date date,
  event_type text,
  event_count int,
  purchase_total decimal,
  error_count int,
  PRIMARY KEY (user_id, event_date, event_type)
);

CREATE TABLE IF NOT EXISTS event_copies (
  event_id uuid,
  table_name text,
  user_id text,
  event_date date,
  event_time timestamp,
  event_type text,
  service text,
  device_id text,
  status text,
  amount decimal,
  metadata text,
  PRIMARY KEY (event_id, table_name)
);
