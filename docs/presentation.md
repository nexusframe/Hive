# HIVE: 5-Minutowa Prezentacja dla Rekrutera

## Struktura prezentacji (5 minut)

---

## 1. Wprowadzenie (30 sekund)

**HIVE** to demonstracja techniczna produkcyjnej architektury full-stack z naciskiem na bezpieczeństwo i skalowalność.

- **Stack**: Flask (Python 3.11) + React 19 (Redux Toolkit)
- **Baza**: MongoDB
- **Cel**: Pokazanie zaawansowanych wzorców bezpieczeństwa, RBAC i architektury warstwowej

---

## 2. Architektura i wzorce (1 minuta)

### Backend: Clean Architecture
```
Routes → Services → Repositories → MongoDB
```

- **Separation of Concerns**: Każda warstwa ma jedną odpowiedzialność (SOLID)
- **Dependency Inversion**: Repozytoria implementują interfejsy, łatwa zamiana implementacji
- **Application Factory**: Modularność i testowanie

### Frontend: Feature-based structure
```
components/ | hooks/ | pages/ | api/ | redux/
```

- **Redux Toolkit**: Centralne zarządzanie stanem (auth, sesje)
- **Protected Routes**: HOC dla kontroli dostępu opartej na rolach
- **Error Boundaries**: Graceful degradation

---

## 3. Bezpieczeństwo — kluczowe elementy (2 minuty)

### Authentication & Authorization

**Dual-Token System:**
- Access token: 15 minut (krótki czas życia)
- Refresh token: 7 dni (długi czas życia)
- **HttpOnly Cookies**: Tokens w `HttpOnly`, `Secure`, `SameSite` cookies → ochrona przed XSS

**RBAC (Role-Based Access Control):**
- Role: `Admin`, `Moderator`, `Regular`
- Granularne uprawnienia na poziomie endpointów i UI
- Frontend ukrywa elementy na podstawie uprawnień

**Automatic Token Refresh:**
- Axios interceptors wykrywają wygaśnięcie tokenu
- Proaktywne odświeżanie przed wygaśnięciem
- Multi-tab coordination: synchronizacja sesji między zakładkami

### Backend Security

**Input Validation:**
- Pydantic schemas dla wszystkich request payloads
- Walidacja na poziomie API przed dotarciem do business logic

**Security Headers:**
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`

**Rate Limiting:**
- Konfigurowalne limity per endpoint
- Szczególnie restrykcyjne na auth routes (zapobieganie brute-force)

**Error Handling:**
- Centralized error handlers
- Bezpieczne odpowiedzi (brak wycieku informacji wewnętrznych)

---

## 4. Funkcjonalności (1 minuta)

### User Management
- Rejestracja z walidacją i sprawdzaniem duplikatów
- Login/Logout z zarządzaniem sesją
- Admin Dashboard: zarządzanie użytkownikami (promote/demote, delete)
- Profile management z wyświetlaniem roli

### Article Domain (demo context)
- **CRUD**: Create, Read, Update, Delete z kontrolą uprawnień
- **Search**: Regex-based search w tytułach
- **Pagination**: Backend-enforced dla wydajności

---

## 5. Jakość kodu i testy (30 sekund)

### Test Coverage
- **Backend**: Unittest z coverage report
- **Frontend**: Jest + React Testing Library
- **E2E**: Cypress dla krytycznych flow (login, registration, admin management)

### Code Quality
- **Type Safety**: Type hints w Pythonie, strict TypeScript
- **Linting**: Pre-commit hooks (Husky, lint-staged)

---

## 6. DevOps i deployment (30 sekund)

- **Docker**: Konteneryzacja backendu i frontendu
- **Docker Compose**: One-command setup
- **Environment-based config**: Oddzielne konfiguracje dla dev/test/prod
- **Swagger UI**: Auto-generated API docs (`/api/docs`)

---

## 7. Podsumowanie i wartości (30 sekund)

### Co pokazuje HIVE:

1. **Zrozumienie bezpieczeństwa**: JWT, HttpOnly cookies, RBAC, rate limiting
2. **Architektura**: Clean Architecture, SOLID, separation of concerns
3. **Full-stack**: Backend (Flask) + Frontend (React) + Database (MongoDB)
4. **Jakość**: Testy backend (63) + frontend (78), walidacja Pydantic
5. **DevOps**: Docker, Gunicorn, Nginx, error handling, logging

### Technologie demonstrowane:
- **Backend**: Python 3.11, Flask, PyMongo, Pydantic, JWT-Extended, Bcrypt
- **Frontend**: React 19, Redux Toolkit, React Router v7, Axios, Tailwind CSS
- **Testing**: Unittest, Jest, RTL, Cypress
- **Infra**: Docker, Docker Compose

---

## Dodatkowe punkty do dyskusji (jeśli czas pozwoli)

- **Repository Pattern**: Abstrakcja warstwy danych, łatwa zamiana MongoDB na inny storage
- **Service Layer**: Business logic oddzielona od API i danych
- **Error Boundaries**: Graceful error handling w React
- **Session Management**: Multi-tab coordination, page visibility API
- **Validation**: Pydantic schemas na backendzie, client-side walidacja na frontendzie

---

## Quick Demo Script (jeśli masz dostęp do aplikacji)

1. **Pokaz architektury** (30s):
   - Struktura folderów backend/frontend
   - Przykład warstw: Route → Service → Repository

2. **Demo bezpieczeństwa** (1 min):
   - Login → pokazanie tokenów w DevTools (HttpOnly cookies)
   - Próba dostępu do admin panel jako regular user → 403
   - Rate limiting na login endpoint

3. **Demo funkcjonalności** (1 min):
   - CRUD articles
   - Search
   - Admin dashboard (jeśli masz admin access)

---

## Kluczowe komunikaty dla rekrutera

✅ **Nie jest to "tylko CRUD"** — to demonstracja zaawansowanych wzorców bezpieczeństwa i architektury

✅ **Swiadome podejscie do security** — security headers, error handling, logging, testing

✅ **Zrozumienie full-stack** — od frontendu przez API po bazę danych

✅ **Dobre praktyki** — SOLID, Clean Architecture, walidacja, testy na wielu poziomach

---

## FAQ — przygotowane odpowiedzi

**Q: Dlaczego MongoDB zamiast PostgreSQL?**  
A: Wybór technologiczny dla demo. Architektura używa Repository Pattern — zamiana na SQL jest prosta dzięki abstrakcji.

**Q: Jakie są największe wyzwania, które rozwiązałeś?**  
A: 
- Multi-tab session coordination (synchronizacja tokenów między zakładkami)
- Automatic token refresh bez przerwania UX
- RBAC na poziomie UI i API

**Q: Jak skalowałbyś to rozwiązanie?**  
A:
- Horizontal scaling: stateless backend, load balancer
- Caching: Redis dla sesji i często używanych danych
- Database: MongoDB sharding lub replikacja
- CDN dla frontendu

---

**Czas prezentacji: ~5 minut**  
**Czas na pytania: 2-3 minuty**

