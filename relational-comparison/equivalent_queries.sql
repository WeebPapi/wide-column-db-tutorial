-- Relational style: flexible filters are natural.
SELECT *
FROM events
WHERE user_id = 'user_001'
  AND event_time >= TIMESTAMP '2026-06-18 00:00:00'
  AND event_time < TIMESTAMP '2026-06-19 00:00:00'
ORDER BY event_time DESC;

-- Cassandra style: model a table for this exact access pattern.
SELECT *
FROM events_by_user
WHERE user_id = 'user_001'
  AND event_date = '2026-06-18'
LIMIT 25;

-- SQL can report across all users without designing a new table first.
SELECT user_id, count(*), sum(amount)
FROM events
WHERE event_type = 'purchase'
GROUP BY user_id
ORDER BY sum(amount) DESC;
