
# Architecture Overview

This document describes the overall architecture of the Hive backend. It outlines the major components, their interactions, design patterns applied, and how the system meets both functional and non-functional requirements.

---

## 1. System Overview

The Hive backend is a RESTful API built with Flask and MongoDB, designed to power a news platform. It exposes endpoints for user authentication, article management, and other functionalities, all while ensuring secure communication through JWT tokens and HTTP-only cookies.

---

## 2. Major Components

### 2.1 Application Layer

- **Flask Application & Application Factory**  
  - The application is created using an application factory pattern (in `app/__init__.py`), ensuring modularity and ease of testing.
  - Configuration is loaded from environment variables via `app/config.py`.

- **API Routes**  
  - Organized into submodules:  
    - **User Routes** (`app/routes/user_routes.py`): Handles user registration, login, logout, token refresh, etc.
    - **Article Routes** (`app/routes/article_routes.py`): Handles article creation, update, deletion, retrieval, listing, and search.
    - **Main Routes** (`app/routes/main_routes.py`): Provides a home route and may include health checks.

- **Error Handlers**  
  - Centralized error handling is provided in `app/error_handlers.py` to catch exceptions and return consistent error responses.

---

## 3. Business Logic Layer

- **Services**  
  - **UserService** (`services/user_service.py`): Implements business logic for user registration, authentication, token management, and user role updates.  
  - **ArticleService** (`services/article_service.py`): Implements business logic for article management including creation, update, retrieval, deletion, and search operations.

---

## 4. Data Access Layer

- **Repositories**  
  - **MongoUserRepository** (`repositories/mongo_user_repository.py`): Provides CRUD operations and token storage for user documents.  
  - **MongoArticleRepository** (`repositories/mongo_article_repository.py`): Provides CRUD operations and query methods for article documents.
  - **Database Initialization** (`repositories/db.py`): Manages the MongoDB client and database connection ensuring a singleton instance across the application.

---

## 5. Utilities & Supporting Modules

- **Logging** (`utilities/logger.py`): Provides a centralized logging utility with UTC formatting for consistent logs.
- **Custom Exceptions** (`utilities/custom_exceptions.py`): Defines application-specific exceptions for the repository and service layers.

---

## 6. Design Patterns

Several design patterns are employed to promote modularity, testability, and maintainability:

- **Application Factory Pattern:**  
  - Used in `app/__init__.py` to create and configure the Flask application dynamically.
  
- **Repository Pattern:**  
  - Abstracts database operations behind an interface (see `base_article_repository.py` and `base_user_repository.py`), making it easier to swap out or modify the data storage layer.

- **Service Layer Pattern:**  
  - Separates business logic from route handling, enabling better testing and reuse of business rules.
  
- **Singleton Pattern (Implicit):**  
  - The database connection is instantiated only once and reused throughout the application via `repositories/db.py`.

---

## 7. Data Flow & Interactions

### 7.1 Request Flow
1. **Client Request:**  
   A client (or front-end application) sends an HTTP request to one of the API endpoints (e.g., `/api/login`).
2. **Routing:**  
   The Flask application routes the request to the appropriate module (User Routes or Article Routes).
3. **Service Invocation:**  
   The route handler calls a corresponding service method (e.g., `UserService.login_user`) to process the request.
4. **Repository Interaction:**  
   The service method interacts with the repository to fetch or modify data stored in MongoDB.
5. **Response:**  
   The service returns data to the route handler, which then sends a JSON response back to the client.

### 7.2 Example Interaction: User Login
- The client sends a POST request with login credentials.
- The User Routes handler calls `UserService.login_user()`.
- UserService queries MongoUserRepository to find a matching user.
- The password is validated, and JWT tokens are generated.
- The refresh token is stored in the database.
- The route returns a success response with tokens (set in HTTP-only cookies).

---

## 8. Diagrams

Refer to the diagrams in the `__docs__/diagrams/` folder for visual representations:
- **Class Diagram:** Outlines major classes and their relationships.
- **Sequence Diagrams:** Detail request flows for critical use cases (e.g., User Login, Create Article).
- **Component Diagram:** Provides a high-level view of system components and their interactions.

---

## 9. Testing Strategy

- **Unit Testing:**  
  Service and repository layers are tested individually.
- **Integration Testing:**  
  Endpoints are tested end-to-end using Flask’s test client.
- **Testing Approach:**  
  Test suites reside under the `__tests__` directory, covering article and user domains.
- **Coverage:**  
  Test coverage reports are generated using `coverage.py` to ensure that most of the codebase is tested.

---

## 10. Deployment

- **Docker:** Used for containerized deployment, ensuring consistent environments from development to production.

---

## 11. Conclusion

The architecture separates concerns across routes, services, and repositories, making the codebase easier to test and extend.
