# GaitGuardian

**GaitGuardian** is a mobility-data workspace concept built with React and Django. It focuses on transparent, descriptive review of walking-measurement datasets, with clear source labels and local file handling.

> **Scope and safety:** The bundled records are fictional. The application does not assess fall risk, predict falls, diagnose conditions, assign clinical scores or provide medical advice. Balance values are treated as source-provided numeric fields, not as a validated clinical scale.

## Live deployment

- **Frontend:** https://gaitguardian-mobility-dashboard.vercel.app
- **Django API:** https://gaitguardian-django-api.vercel.app
- **Health endpoint:** https://gaitguardian-django-api.vercel.app/api/health/

The React frontend and Django API are deployed as separate, Git-connected Vercel projects.

## Product capabilities

- Descriptive summaries for walking speed, left/right step-time comparison and average step time.
- Search measurement sample labels and filter by minimum/maximum walking speed.
- Sort measurements by sample label, walking speed or left/right step time.
- Paginated, validated responses with clear errors for invalid numeric filters and page values.
- Database-aware health checks in local/database mode; static demo mode explicitly reports that a database is not required.
- SVG trend visualisation and a session-level measurement register.
- CSV import parsed locally in the browser; files are not uploaded to Django.
- CSV export of the currently loaded dataset.
- Source labels and CSV validation for missing columns, malformed quotes, invalid numbers, file size and row count.
- Original dashboard preserved at `frontend/public/prototype.html`.

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19.3.1, Vite 8.3.8, JavaScript |
| Backend | Django 6.1.3, Python 3.13 |
| Local data | Django ORM and SQLite |
| Deployed demo data | Read-only Python dataset (`DEMO_DATA_MODE=true`) |
| Visualisation | Responsive SVG chart and semantic HTML table |
| API | Read-only JSON endpoints |
| Hosting | Vercel frontend and Django Python runtime |
| CI | GitHub Actions |

## Runtime requirements

- Node.js 22.12 or newer
- Python 3.12 or newer (Python 3.13 is used in CI and deployment)

## Run locally

### 1. Start the Django API

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver 8000
```

### 2. Start the React frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The Vite development server proxies `/api` requests to Django on port 8000.

## CSV format

The local file picker expects the following headers:

```csv
date,left_step_time,right_step_time,walking_speed,balance_score
Sample 01,0.60,0.62,0.78,76
```

All measurement columns must contain valid numeric values. The starter limits imports to 5 MB and 5,000 rows. Quoted fields, commas and escaped quotes are supported. The file is parsed in the browser and is not transmitted to the backend.

## API reference

All endpoints are read-only and accept GET requests.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health/` | Service, data-mode and database readiness status |
| GET | `/api/measurements/` | List fictional demonstration measurements |
| GET | `/api/measurements/?q=sample%2002` | Search sample labels |
| GET | `/api/measurements/?min_walking_speed=0.8&max_walking_speed=1.0` | Filter a walking-speed range |
| GET | `/api/measurements/?sort=walking_speed&order=desc` | Sort by sample label, speed or left/right step time |

### Pagination and validation

- `page` is a positive integer (default `1`).
- `page_size` is an integer from `1` to `100` (default `25`).
- `count` is the total number of records matching the filters; `items` contains the requested page.
- The `pagination` object reports page, page size, total items/pages and next/previous flags.
- Numeric filters must be finite decimal values. A minimum walking speed greater than the maximum is rejected with HTTP 400.
- Invalid filters, sort modes and page values return a structured `error` object.

The local CSV import does not create a server-side record or upload a file. The API remains read-only.

## Quality checks

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

Frontend:

```bash
cd frontend
npm install
npm test
npm run build
```

GitHub Actions runs the frontend tests/build and Django checks/tests on pushes to `main` and pull requests.

## Deployment configuration

- **Vercel frontend root:** `frontend/`
- **Vercel frontend build:** `npm run build`
- **Vercel frontend output:** `dist/`
- **Frontend API variable:** `VITE_API_BASE_URL=https://gaitguardian-django-api.vercel.app`
- **Vercel Django API root:** `backend/`
- **API framework:** Django, using Vercel's native Python runtime.
- Set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in the API project's environment.

The hosted API uses `DEMO_DATA_MODE=true` and returns a read-only, fictional data set from Python code. This avoids depending on an ephemeral SQLite file in a serverless function. For local development, leave `DEMO_DATA_MODE` unset or set it to `false` to use the Django ORM and seed command. Persistent measurement storage has not been implemented.

## Responsible-development roadmap

1. Define measurement protocols, units, provenance and data-quality requirements.
2. Evaluate instrumentation and measurement reliability before presenting interpreted results.
3. Add privacy, consent, retention and access-control design before accepting personal data.
4. Involve appropriate domain experts before making health-related interpretations.
5. Keep outputs descriptive unless validated and reviewed for a clearly defined purpose.

No fall-risk detection or medical assessment is implemented in this project.
