# Campus Shop Clickstream with Apache Cassandra

This repo contains a local Cassandra tutorial app for a university project on wide-column databases.

The topic is **Campus Shop Clickstream**: a fictional student shop records logins, product views, searches, purchases, device activity, and checkout errors. The app first shows an interactive demo of how events become Cassandra rows, then guides you through setting up and querying Cassandra yourself.

## What You Need

- Docker Desktop
- Git
- A terminal: PowerShell, Terminal, Git Bash, or similar
- A laptop with enough memory for one Cassandra container

You do not need to install Cassandra locally. Docker runs it for you.

## Start The Project

Clone the repo:

```bash
git clone https://github.com/WeebPapi/wide-column-db-tutorial.git
cd wide-column-db-tutorial
```

Start everything:

```bash
docker compose up -d
```

Open the app:

```text
http://localhost:3000
```

Use a normal terminal for Docker/API commands. Use the `cqlsh` prompt for Cassandra CQL snippets.

## What To Do In The App

1. Start with **Demo: what we build**.
2. Scroll through the mini-topics: shop actions, event shape, table copies, query-first modelling, partitions, limits, and SQL comparison.
3. Try the small interactions in each section.
4. Move through the tutorial steps in the sidebar.
5. Copy the terminal snippets into your normal terminal, and paste CQL snippets into `cqlsh`.

The website is a guide, not a replacement for your terminal.

## Useful URLs

- App: http://localhost:3000
- Backend health check: http://localhost:8000/api/health
- Cassandra port: `localhost:9042`

## If Cassandra Is Not Ready

Cassandra often needs 60-90 seconds after Docker starts.

Check containers:

```bash
docker compose ps
```

Try cqlsh:

```bash
docker compose exec cassandra cqlsh -e "DESCRIBE KEYSPACES"
```

If it fails, wait 30 seconds and run the command again.

## If The App Does Not Open

Make sure Docker is still running:

```bash
docker compose ps
```

Check frontend logs:

```bash
docker compose logs frontend
```

If port `3000` is already used by another app, stop that app or change the frontend port in `docker-compose.yml`.

## If The Backend Fails

Check backend logs:

```bash
docker compose logs backend
```

Check the health endpoint:

```bash
curl http://localhost:8000/api/health
```

If Cassandra is still starting, backend errors may clear after Cassandra becomes ready.

## Reset Everything

This deletes the Cassandra Docker volume and starts clean:

```bash
docker compose down -v
docker compose up -d
```

Use this if your schema/data gets into a confusing state.

## Stop The Project

Stop containers but keep data:

```bash
docker compose down
```

Stop containers and delete data:

```bash
docker compose down -v
```

## Project Structure

```text
frontend/                React guide app
backend/                 FastAPI helper API
cassandra/               Keyspace, schema, seed notes, reset CQL
tutorial/                Exercises, solutions, troubleshooting
relational-comparison/   SQL comparison examples
scripts/                 Optional helper scripts
data/                    Generated data notes
```

## Optional Checks

Backend tests:

```bash
cd backend
py -3.12 -m pytest
```

Live smoke test after the Docker stack is running:

```bash
python scripts/smoke_test.py
```
