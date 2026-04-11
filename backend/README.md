# Hive Backend API

Flask REST API with JWT authentication, RBAC, and MongoDB.

## Structure

```
backend/
├── app/
│   ├── __init__.py          # Application factory (create_app)
│   ├── config.py            # Configuration from environment variables
│   ├── extensions.py        # Flask extensions (JWT, Limiter)
│   ├── error_handlers.py    # Centralized error handling
│   ├── schemas.py           # Pydantic request validation schemas
│   └── routes/
│       ├── article_routes.py
│       ├── user_routes.py
│       └── main_routes.py   # Home + /health endpoint
├── services/
│   ├── article_service.py
│   └── user_service.py
├── repositories/
│   ├── base_article_repository.py   # Abstract base
│   ├── base_user_repository.py      # Abstract base
│   ├── mongo_article_repository.py
│   ├── mongo_user_repository.py
│   └── db.py                        # MongoDB connection + index creation
├── utilities/
│   ├── auth_utils.py          # Cookie helpers
│   ├── custom_exceptions.py
│   ├── decorators.py          # validate_request
│   └── logger.py
├── __tests__/
│   ├── conftest.py            # Shared pytest fixtures
│   ├── article/               # 6 test files (33 tests)
│   └── user/                  # 9 test files (30 tests)
├── wsgi.py                    # Gunicorn entry point
├── app.py                     # Dev server entry point
├── requirements.txt
└── Dockerfile
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env  # edit with your values
```

## Run

```bash
# Development
python app.py

# Production (Docker)
gunicorn --bind 0.0.0.0:5000 --workers 4 wsgi:application
```

## Test

```bash
# Requires running MongoDB
python -m pytest __tests__/ -v --tb=short
```

## API

Swagger UI: http://localhost:5000/api/docs

Health check: `GET /health` returns `{"status": "healthy", "database": "connected"}`

## Environment Variables

See `env.example` for all required variables. Key ones:
- `SECRET_KEY` — Flask session secret (required)
- `JWT_SECRET_KEY` — JWT signing key (required)
- `MONGO_URI` — MongoDB connection string
- `FLASK_ENV` — `development` or `production`
