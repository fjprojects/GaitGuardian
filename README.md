# GaitGuardian

**GaitGuardian** is a mobility-data workspace concept built with React and Django. It focuses on transparent, descriptive review of walking-measurement datasets, with clear source labels and local file handling.

> **Scope and safety:** The bundled records are fictional. The application does not assess fall risk, predict falls, diagnose conditions, assign clinical scores or provide medical advice. Balance values are treated as source-provided numeric fields, not as a validated clinical scale.

## Product capabilities
- Descriptive summaries for walking speed, left/right step-time comparison and average step time.
- SVG trend visualisation and a session-level measurement register.
- CSV import parsed locally in the browser; files are not uploaded to Django.
- CSV export of the currently visible dataset.
- Clear sample/local source labels and data-quality checks during import.
- Django-backed demonstration measurement records and a reproducible seed command.
- Original dashboard preserved at frontend/public/prototype.html.

## Runtime requirements\n- Node.js 22.12 or newer\n- Python 3.12 or newer (Python 3.13 is used in CI)\n\n## Technology
| Layer | Stack |
|---|---|
| Frontend | React 19.3.1, Vite 8.3.8, JavaScript |
| Backend | Django 6.1.3, Python |
| Data | Django ORM, SQLite locally, PostgreSQL via DATABASE_URL |
| Visualisation | Responsive SVG chart and semantic HTML table |
| API | Read-only JSON endpoints |

## Run locally
### 1. Django API
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

### 2. React frontend
```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally http://localhost:5173). Vite proxies /api requests to Django on port 8000.

## CSV format
The local file picker expects the following headers:
```csv
date,left_step_time,right_step_time,walking_speed,balance_score
Sample 01,0.60,0.62,0.78,76
```
All measurement columns must contain valid numeric values. Imports are limited to 5,000 rows in this starter. The file is parsed in the browser and is not transmitted to the backend.

## API reference
| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/health/ | Health and framework version |
| GET | /api/measurements/ | List fictional demonstration measurements |

The measurement API is read-only in this starter. It does not accept personal measurement uploads.

## Quality checks
```bash
cd backend
python manage.py check
python manage.py test
```
```bash
cd frontend
npm run build
```
GitHub Actions runs the frontend build and backend tests on pushes to main and pull requests.

## Deployment notes
- Set the Vercel project root to frontend, build with npm run build and use dist as output.
- Set VITE_API_BASE_URL to the deployed Django API origin when building the frontend.
- Deploy backend as a Python web service with gunicorn config.wsgi:application.
- Configure DJANGO_SECRET_KEY, DJANGO_DEBUG=false, DJANGO_ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS and a persistent PostgreSQL DATABASE_URL.
- Run python manage.py migrate and python manage.py seed_demo_data after deployment.

## Responsible-development roadmap
1. Define measurement protocols, units, provenance and data-quality requirements.
2. Evaluate instrumentation and measurement reliability before presenting interpreted results.
3. Add privacy, consent, retention and access-control design before accepting any personal data.
4. Involve appropriate domain experts before making health-related interpretations.
5. Keep all future outputs descriptive unless validated and reviewed for a clearly defined purpose.

No fall-risk detection or medical assessment is implemented in this project.