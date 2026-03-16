# Backend smoke tests

Run against a **running** backend instance.

## Local (Docker Compose)

From repo root (`picanut/`):

```bash
docker compose up --build
```

Then in another shell:

```bash
python backend/scripts/smoke_test.py --base-url http://localhost:8000 --create-fixtures --run-admin-tests
```

## VPS / remote

```bash
python backend/scripts/smoke_test.py --base-url https://YOUR_DOMAIN --run-admin-tests
```

Environment overrides:
- `LABELFLOW_BASE_URL`
- `LABELFLOW_ADMIN_USER`
- `LABELFLOW_ADMIN_PASS`

