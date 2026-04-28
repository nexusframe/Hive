# Hive: RBAC & Article Management System

## Overview

**Hive** is a full-stack web application for article management with Role-Based Access Control. Built as a learning/portfolio project to explore authentication patterns, layered architecture, and modern frontend tooling.

Built with **Flask (Python)** backend and **React 19 (Redux Toolkit)** frontend, backed by **MongoDB**.

## Architecture

### Backend (Flask)
- **Layered architecture**: Routes -> Services -> Repositories (abstract base classes)
- **JWT auth**: Access tokens (15min) + refresh tokens (7 days) in HttpOnly cookies
- **RBAC**: Admin, Moderator, Regular roles with per-endpoint checks
- **Input validation**: Pydantic schemas for all request payloads
- **Rate limiting**: Configurable per-endpoint (auth: 5/min, write: 20/min)
- **Security headers**: CSP, X-Frame-Options, X-Content-Type-Options

### Frontend (React)
- **Redux Toolkit** for auth state management
- **Axios interceptors** for automatic token refresh
- **Multi-tab session coordination** via localStorage events
- **Protected routes** with role-based visibility
- **Tailwind CSS** with custom design system (amber/honey brand colors)

## Features

- User registration, login, logout with secure token handling
- Admin dashboard: user management (create, edit roles, delete)
- Article CRUD with author/role-based permissions
- Search articles by title and content
- Paginated lists with bounds validation

## Quick Start (Docker)

```bash
# 1. Configure environment
cp env.docker.example .env
# Edit .env — set SECRET_KEY, JWT_SECRET_KEY, MONGO_ROOT_PASSWORD

# 2. Run
docker-compose up --build -d

# 3. Access
# Frontend: http://localhost:3000
# API:      http://localhost:5000
# Health:   http://localhost:5000/health
# Swagger:  http://localhost:5000/api/docs
```

## Local Development

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env  # edit with your values
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Testing

### Backend (50+ tests, pytest)
```bash
cd backend
source .venv/bin/activate
python -m pytest __tests__/ -v
```

### Frontend (60+ tests, Jest + React Testing Library)
```bash
cd frontend
npx jest --watchAll=false --verbose
# With coverage:
npx jest --watchAll=false --coverage
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Python 3.11, Flask, PyMongo, Pydantic, PyJWT, Bcrypt, Gunicorn |
| Frontend | React 19, Redux Toolkit, React Router v7, Axios, Tailwind CSS |
| Database | MongoDB 7.0 |
| Infra | Docker, Docker Compose, Nginx |
| Testing | Pytest, Jest, React Testing Library, Cypress |

## Project Structure

```
hive/
├── backend/
│   ├── app/              # Flask app factory, config, routes, schemas
│   ├── services/         # Business logic
│   ├── repositories/     # Data access (abstract + MongoDB impl)
│   ├── utilities/        # Auth, logging, decorators
│   ├── __tests__/        # Backend tests (article/ + user/)
│   └── wsgi.py           # Gunicorn entry point
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios instance with interceptors
│   │   ├── components/   # ArticleCard, Navbar, SessionManager, etc.
│   │   ├── pages/        # Login, Register, Articles, Admin, etc.
│   │   ├── redux/        # Store + authSlice
│   │   └── hooks/        # useTokenRefresh
│   └── cypress/          # E2E tests
├── docs/                 # C4 model architecture docs
└── docker-compose.yml
```

## License

MIT License
