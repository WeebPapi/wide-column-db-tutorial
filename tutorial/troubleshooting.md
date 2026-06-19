# Troubleshooting

- If the web app opens but Cassandra is disconnected, wait one minute and click Refresh.
- If initialization fails, run `docker compose logs cassandra backend`.
- If port 3000 or 8000 is already used, stop the conflicting local service or edit `docker-compose.yml`.
- If data looks stale, use Reset Database and then Generate and Load Demo Data.
- If Docker is slow, use the small dataset.
