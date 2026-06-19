# Wide-Column Databases with Apache Cassandra

A self-contained university final project about wide-column databases using Apache Cassandra. The local web app guides students through concepts, schema design, data loading, prepared CQL queries, denormalization, unsupported-query trade-offs, GenAI critique, presenter mode, and a two-hour tutorial flow.

## One-command startup

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

First run:

1. Click **Initialize Database**.
2. Click **Generate and load demo data**.
3. Enter **Presenter Mode** or **Tutorial Mode**.

## Prerequisites

- Docker Desktop
- Git
- A laptop with enough memory for one Cassandra container

## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/health
- Cassandra native port: localhost:9042

## Vercel preview

Vercel can host the interactive frontend plus a lightweight mock API for online review. The real Cassandra lab still runs locally through Docker Compose.

## Architecture

```text
Browser
  -> React/Vite frontend
  -> FastAPI backend
  -> Apache Cassandra 4.1
```

## Services

- `frontend`: interactive workshop UI.
- `backend`: FastAPI API, Cassandra readiness, schema initialization, deterministic data loading, prepared queries.
- `cassandra`: single local Cassandra node for classroom use.

Production Cassandra normally runs as a multi-node cluster. This project uses one node to keep the classroom setup manageable.

## Reset

In the app, click **Reset Database** and confirm. From the terminal:

```bash
docker compose down -v
docker compose up --build
```

## Demo Mode

Presenter Mode gives larger text, a live-demo sequence, teaching points, and presenter prompts for the three-person group.

## Tutorial Mode

Tutorial Mode follows a two-hour timeline: startup, concepts, schema, initialization, guided queries, key exercises, denormalization, GenAI, SQL comparison, and summary.

## Common Errors

- Cassandra disconnected: wait 60-90 seconds and click Refresh.
- Backend unavailable: check `docker compose logs backend`.
- Port conflict: free ports 3000, 8000, or 9042.
- Empty query results: load demo data, then use a date shown in the dataset stats.

## Project Structure

```text
backend/                 FastAPI app and tests
frontend/                React/Vite workshop UI
cassandra/               Inspectable CQL schema/reset files
scripts/                 data, benchmark, and smoke utilities
docs/                    project overview and runbook
tutorial/                exercise handouts and solutions
relational-comparison/   SQL schema and equivalent query examples
```

## Testing

Backend unit tests:

```bash
cd backend
pytest
```

Live smoke test after `docker compose up --build`:

```bash
python scripts/smoke_test.py
```
