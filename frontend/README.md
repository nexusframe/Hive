# Hive Frontend

React 19 SPA with Redux Toolkit, JWT auth via HttpOnly cookies, and Tailwind CSS.

## Setup

```bash
npm install
npm start        # Dev server on http://localhost:3000
```

## Test

```bash
npx jest --watchAll=false --verbose     # 69 tests
npx jest --watchAll=false --coverage    # With coverage report
```

## Build

```bash
npm run build    # Production build in build/
```

## Architecture

- **Redux Toolkit** — auth state (`authSlice`) with async thunks for login/logout/register/refresh
- **Axios interceptors** — automatic 401 -> refresh -> retry flow
- **SessionManager** — proactive token refresh, multi-tab coordination, visibility handling
- **Protected routes** — `ProtectedRoute` + `PersistLogin` wrappers
- **Tailwind CSS** — custom design system with amber brand colors, stone neutrals

## Key Files

```
src/
├── api/axiosInstance.js      # Axios with auth interceptors
├── components/
│   ├── Navbar.js             # Dark navbar with RBAC links
│   ├── SessionManager.js     # Token refresh orchestration
│   ├── ArticleCard.js        # Article list item
│   ├── ArticleForm.js        # Create/edit form with validation
│   └── ...
├── pages/                    # Login, Register, Articles, Profile, Admin
├── redux/slices/authSlice.js # Auth state + thunks
├── hooks/useTokenRefresh.js  # Timer-based proactive refresh
└── styles/index.css          # Tailwind + component classes
```

## Docker

The Dockerfile uses a multi-stage build: Node build -> Nginx serve. Nginx proxies `/api/*` to the backend service.
