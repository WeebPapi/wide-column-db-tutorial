# Wide-Column Databases Final Project - Project Overview

## Project topic

Wide-column databases using Apache Cassandra.

## Core message

Cassandra tables are designed around the queries the application needs to run. It is not universally better than relational databases.

## Use case

High-volume application event and user activity tracking: logins, page views, searches, purchases, errors, API requests, and device activity.

## Technology stack

- React, TypeScript, Vite frontend
- FastAPI backend
- Apache Cassandra 4.1 single-node Docker service
- Docker Compose

## Web app concept

Students run `docker compose up --build`, open `http://localhost:3000`, and complete the live demo and tutorial through one local application.

## Access patterns

- Latest events for a user on a day
- User events within a bounded time range
- Recent events by event type
- Recent errors by service
- Daily activity summaries by user
- Recent events by device
- New-table exercise for purchase events by device and day

## Cassandra tables

- `events_by_user`
- `events_by_type`
- `errors_by_service`
- `events_by_device`
- `daily_user_activity`
- `event_copies`

## Deliverables

- Docker Compose stack
- Cassandra schema
- Deterministic sample data generator
- Backend API
- Interactive tutorial UI
- Presenter Mode and Tutorial Mode
- SQL comparison materials
- Tests and smoke script
- Markdown project documents

## Repository structure

The repository is split into `frontend`, `backend`, `cassandra`, `scripts`, `docs`, `tutorial`, `data`, and `relational-comparison`.

## Presentation structure

The presentation covers concepts, a scenario where Cassandra excels, a guided tutorial, hands-on exercises, GenAI critique, and a fair SQL comparison.

## Three-person split

- Person 1: concepts, architecture, trade-offs, suitable and unsuitable use cases
- Person 2: data modelling, partition keys, clustering columns, denormalization, SQL comparison
- Person 3: Docker workflow, web app, data loading, guided queries, benchmark

## Minimum viable version

The first version includes one-command startup, status, initialization, sample data, schema explorer, four prepared query views, denormalization, unsupported query exercise, table-design exercise, SQL comparison, Presenter Mode, Tutorial Mode, docs, and tests.

## Immediate next actions

Run the stack on the presentation laptop, tune sample dates in the demo notes, and rehearse the three-person timing.

## Final takeaway

Use Cassandra when predictable high-volume access patterns can be modelled up front into bounded partitions and query-specific tables.
