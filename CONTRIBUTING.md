# Contributing to Hive

## Prerequisites

- Python 3.11+
- Node.js 22+
- Docker & Docker Compose
- MongoDB (local or via Docker)

## Repository Structure

```
hive/
├── backend/        # Flask API
├── frontend/       # React SPA
├── docs/           # Architecture documentation (C4 model)
└── docker-compose.yml
```

## Development Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env   # edit with your values
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Docker (full stack)

```bash
cp env.docker.example .env   # edit secrets
docker-compose up --build -d
```

## Testing

Run tests before submitting changes:

```bash
# Backend (requires MongoDB)
cd backend && python -m pytest __tests__/ -v

# Frontend
cd frontend && npx jest --watchAll=false
```

## Linting

### Python
```bash
cd backend
flake8 .
```

### JavaScript
```bash
cd frontend
npx eslint .
```

## Pull Requests

1. Create a feature branch from `development`
2. Make changes, add tests for new functionality
3. Run tests and linting
4. Submit PR with a summary of changes
