# Wide-Column Databases Final Project - Project Overview

## Project topic

Campus Shop Clickstream: modelling user activity history with Apache Cassandra.

## Core message

Cassandra tables are designed around the queries the application needs to run. It is not universally better than relational databases.

## Use case

A fictional student shopping app records logins, page views, searches, purchases, API requests, device activity, and checkout errors.

## Technology stack

- React, TypeScript, Vite frontend
- FastAPI backend
- Apache Cassandra 4.1 single-node Docker service
- Docker Compose

## Web app concept

Students run `docker compose up --build`, open `http://localhost:3000`, and use the website as a guided lab manual. The site provides commands, CQL snippets, expected results, and optional checks, but students still interact with Cassandra through `cqlsh`.

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

The revised first version includes one-command startup, a student-facing lab guide, CQL snippets, manual schema/query tasks, sample data loading, schema explorer, optional query checks, unsupported query exercise, table-design exercise, SQL comparison, Presenter Mode, Tutorial Mode, docs, and tests.

## Immediate next actions

Run the stack on the presentation laptop, tune sample dates in the demo notes, and rehearse the three-person timing.

## Final takeaway

Use Cassandra when predictable high-volume access patterns can be modelled up front into bounded partitions and query-specific tables.
