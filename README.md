# Campus Shop Clickstream with Apache Cassandra

A self-contained university final project about wide-column databases using Apache Cassandra.

The specific topic is **Campus Shop Clickstream**: modelling user activity history, purchases, device activity, and service errors for a fictional student shopping app.

The website has one flow for everybody: an interactive demo of the use case, followed by a hands-on tutorial with terminal and CQL snippets. Students still run Cassandra commands themselves with Docker and `cqlsh`.

## One-command startup

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

First run:

1. Use the interactive demo to see how app actions become Cassandra rows.
2. Follow the tutorial steps in the left sidebar.
3. Run the shown Docker and `cqlsh` commands in your terminal.

## Prerequisites

- Docker Desktop
- Git
- A laptop with enough memory for one Cassandra container

## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/health
- Cassandra native port: localhost:9042

## Vercel preview

Vercel can host the interactive guide for online review. The deployed site uses mock data. The real Cassandra lab runs locally through Docker Compose.

## Architecture

```text
Browser
  -> React/Vite frontend
  -> FastAPI backend
  -> Apache Cassandra 4.1
```

## Services

- `frontend`: guided lab UI with command snippets and optional checks.
- `backend`: FastAPI API for sample data loading, query checks, and validation helpers.
- `cassandra`: single local Cassandra node for classroom use.

Production Cassandra normally runs as a multi-node cluster. This project uses one node to keep the classroom setup manageable.

## Reset

From the terminal:

```bash
docker compose down -v
docker compose up --build
```

## Demo Section

The first section is an interactive Campus Shop clickstream demo. Students click app actions such as login, search, purchase, and checkout error, then see how one logical event is copied into Cassandra query tables.

## Tutorial Section

The tutorial section provides copyable terminal and CQL snippets for Docker startup, Cassandra readiness checks, schema creation, data loading, manual queries, bad-query discussion, GenAI critique, and SQL comparison.

## Common Errors

- Cassandra disconnected: wait 60-90 seconds and click Refresh.
- Backend unavailable: check `docker compose logs backend`.
- Port conflict: free ports 3000, 8000, or 9042.
- Empty query results: load demo data, then use one of the dates returned by `/api/data/load`.

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
