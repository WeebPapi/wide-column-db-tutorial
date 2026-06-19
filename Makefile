.PHONY: up down test smoke logs

up:
	docker compose up --build

down:
	docker compose down

test:
	cd backend && pytest

smoke:
	python scripts/smoke_test.py

logs:
	docker compose logs -f backend frontend cassandra
