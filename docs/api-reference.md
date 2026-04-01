# Hive API Reference

## Overview

API endpoints, request/response structures, error codes, and authentication.

**Base URL**: `/api`  
**API Documentation**: Swagger UI available at `/api/docs`  
**Authentication**: JWT-based (HttpOnly cookies)

---

## Authentication

### JWT Token System

Hive uses a dual-token authentication system:

- **Access Token**: Short-lived token (15 minutes). Used for accessing protected endpoints.
- **Refresh Token**: Longer-lived token (7 days). Used to obtain new access tokens.

**Token Storage**: Tokens are stored in HttpOnly cookies to prevent XSS attacks:
- `access_token`: HttpOnly, Secure, SameSite=Strict
- `refresh_token`: HttpOnly, Secure, SameSite=Strict

**Token Usage**:
- Access tokens are automatically sent via cookies with each request
- When access token expires, use `/api/refresh` to obtain a new one
- Refresh tokens are used only for token refresh operations

### Authentication Headers

For cookie-based authentication (default), no headers are required. Cookies are automatically sent by the browser.

For header-based authentication (alternative):
```
Authorization: Bearer <access_token>
```

---

## Endpoints

### Public Endpoints

#### GET /

Returns a welcome message.

**Response**:
- **200 OK**
```json
{
  "message": "Welcome to Hive!"
}
```

---

### Authentication Endpoints

#### POST /api/register

Registers a new user account.

**Request Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Validation**:
- `username`: Required, non-empty string
- `email`: Required, valid email format
- `password`: Required, minimum 6 characters

**Responses**:
- **201 Created**
```json
{
  "message": "User registered successfully!",
  "user_id": "string"
}
```

- **400 Bad Request**: Missing required fields or validation failure
```json
{
  "error": "Validation error message"
}
```

- **400 Bad Request**: User already exists
```json
{
  "error": "User already exists"
}
```

- **500 Internal Server Error**: Registration error

**Rate Limiting**: Applied (stricter limits to prevent abuse)

---

#### POST /api/login

Authenticates a user and issues JWT tokens.

**Request Body**:
```json
{
  "username_or_email": "string",
  "password": "string"
}
```

**Note**: `username_or_email` accepts either username or email address.

**Responses**:
- **200 OK**
```json
{
  "message": "Login successful",
  "username": "string",
  "claims": {
    "sub": "user_id",
    "role": "regular|moderator|admin",
    "exp": 1234567890
  }
}
```

Tokens are set in HttpOnly cookies (`access_token`, `refresh_token`).

- **401 Unauthorized**: Invalid credentials
```json
{
  "error": "Invalid credentials"
}
```

**Rate Limiting**: Applied (stricter limits to prevent brute-force attacks)

---

#### POST /api/refresh

Refreshes the access token using a valid refresh token.

**Request**: Refresh token must be present in HttpOnly cookie (`refresh_token`)

**Responses**:
- **200 OK**
```json
{
  "message": "Token refreshed successfully",
  "access_token": "string",
  "refresh_token": "string"
}
```

New tokens are set in HttpOnly cookies.

- **401 Unauthorized**: Missing or invalid refresh token
```json
{
  "error": "Invalid or expired refresh token"
}
```

---

#### POST /api/logout

Logs out the user by invalidating tokens and clearing cookies.

**Authentication**: Required (access token)

**Responses**:
- **200 OK**
```json
{
  "message": "Logged out successfully"
}
```

Cookies are cleared on the client side.

---

#### GET /api/protected

Protected endpoint example that returns user identity and JWT claims.

**Authentication**: Required (access token)

**Responses**:
- **200 OK**
```json
{
  "username": "string",
  "role": "regular|moderator|admin"
}
```

- **401 Unauthorized**: Missing or invalid access token

---

### User Management Endpoints (Admin Only)

#### GET /api/users

Retrieves a list of all users.

**Authentication**: Required (Admin role)

**Query Parameters**:
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page

**Responses**:
- **200 OK**: Array of user objects
- **403 Forbidden**: Insufficient permissions
- **401 Unauthorized**: Missing or invalid token

---

#### PUT /api/users/{user_id}

Updates a user (typically role modification).

**Authentication**: Required (Admin role)

**Path Parameters**:
- `user_id`: User ID (MongoDB ObjectId)

**Request Body**:
```json
{
  "role": "regular|moderator|admin"
}
```

**Responses**:
- **200 OK**
```json
{
  "message": "User updated successfully"
}
```

- **404 Not Found**: User not found
- **403 Forbidden**: Insufficient permissions
- **400 Bad Request**: Invalid role value

---

#### DELETE /api/users/{user_id}

Deletes a user account.

**Authentication**: Required (Admin role)

**Path Parameters**:
- `user_id`: User ID (MongoDB ObjectId)

**Responses**:
- **200 OK**
```json
{
  "message": "User deleted successfully"
}
```

- **404 Not Found**: User not found
- **403 Forbidden**: Insufficient permissions

---

### Article Endpoints

#### GET /api/articles

Retrieves a paginated list of articles.

**Query Parameters**:
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page

**Responses**:
- **200 OK**: Array of article objects with pagination metadata
```json
{
  "articles": [
    {
      "_id": "string",
      "title": "string",
      "content": "string",
      "author_id": "string",
      "created_at": "ISO 8601 datetime",
      "updated_at": "ISO 8601 datetime"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 100
}
```

- **500 Internal Server Error**: Error retrieving articles

---

#### POST /api/articles

Creates a new article.

**Authentication**: Required (authenticated user)

**Request Body**:
```json
{
  "title": "string",
  "content": "string"
}
```

**Validation**:
- `title`: Required, non-empty string
- `content`: Required, non-empty string

**Responses**:
- **201 Created**
```json
{
  "message": "Article created successfully",
  "article_id": "string"
}
```

- **400 Bad Request**: Missing title or content
- **401 Unauthorized**: Missing or invalid token
- **500 Internal Server Error**: Error creating article

---

#### GET /api/articles/{article_id}

Retrieves a single article by its ID.

**Path Parameters**:
- `article_id`: Article ID (MongoDB ObjectId)

**Responses**:
- **200 OK**: Article object
```json
{
  "_id": "string",
  "title": "string",
  "content": "string",
  "author_id": "string",
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime"
}
```

- **404 Not Found**: Article not found

---

#### PUT /api/articles/{article_id}

Updates an existing article.

**Authentication**: Required (authenticated user, owner or Moderator/Admin)

**Path Parameters**:
- `article_id`: Article ID (MongoDB ObjectId)

**Request Body**:
```json
{
  "title": "string",    // Optional
  "content": "string"    // Optional
}
```

At least one field (`title` or `content`) must be provided.

**Responses**:
- **200 OK**
```json
{
  "message": "Article updated successfully"
}
```

- **400 Bad Request**: No data provided for update
- **404 Not Found**: Article not found
- **403 Forbidden**: User is not the owner and lacks permissions
- **401 Unauthorized**: Missing or invalid token

---

#### DELETE /api/articles/{article_id}

Deletes an article.

**Authentication**: Required (authenticated user, owner or Moderator/Admin)

**Path Parameters**:
- `article_id`: Article ID (MongoDB ObjectId)

**Responses**:
- **200 OK**
```json
{
  "message": "Article deleted successfully"
}
```

- **404 Not Found**: Article not found
- **403 Forbidden**: User is not the owner and lacks permissions
- **401 Unauthorized**: Missing or invalid token

---

#### GET /api/articles/search

Searches articles by title or content using regex.

**Query Parameters**:
- `q` (required): Search query string

**Responses**:
- **200 OK**: Array of matching article objects
- **400 Bad Request**: Missing query parameter

---

## Error Handling

The API returns consistent JSON error responses:

| Status Code | Meaning | Example Response |
|------------:|:--------|:-----------------|
| 400 | **Bad Request** | `{"error": "Invalid request payload"}` |
| 401 | **Unauthorized** | `{"error": "Missing or invalid JWT token"}` |
| 403 | **Forbidden** | `{"error": "Insufficient permissions"}` |
| 404 | **Not Found** | `{"error": "Resource not found"}` |
| 500 | **Internal Server Error** | `{"error": "An unexpected error occurred"}` |

**Error Response Format**:
```json
{
  "error": "Error message description"
}
```

Detailed error information is logged server-side but not exposed to clients for security reasons.

---

## Rate Limiting

Rate limiting is applied to prevent abuse:

- **Auth endpoints** (`/api/login`, `/api/register`): Stricter limits
- **General endpoints**: Standard limits
- **Rate limit headers**: Included in responses when limits are approached

Rate limit exceeded responses return **429 Too Many Requests**.

---

## Swagger/OpenAPI Documentation

Interactive API documentation is available at `/api/docs` (Swagger UI).

The OpenAPI specification is auto-generated from Flask routes and can be accessed at `/api/docs.json`.

**Key Features**:
- Interactive endpoint testing
- Request/response schema documentation
- Authentication testing (cookie-based)
- Example requests and responses

---

## Security Considerations

### Security Headers

The API sets the following security headers:
- `Content-Security-Policy`: Restricts resource loading
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `Strict-Transport-Security`: Enforces HTTPS (production)

### Input Validation

All request payloads are validated using Pydantic schemas:
- Type checking
- Required field validation
- Format validation (email, etc.)
- Length constraints

### CORS

CORS is configured to allow requests only from the frontend origin in production.

---

## Best Practices

1. **Always use HTTPS** in production
2. **Handle token expiration**: Implement automatic token refresh
3. **Respect rate limits**: Implement exponential backoff on 429 responses
4. **Validate inputs**: Client-side validation complements server-side validation
5. **Error handling**: Check status codes and handle errors gracefully
6. **Token storage**: Rely on HttpOnly cookies (handled automatically by browser)

---

## Examples

### Login Flow

```javascript
// 1. Login request
const response = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username_or_email: 'user@example.com',
    password: 'password123'
  }),
  credentials: 'include' // Important: sends/receives cookies
});

// 2. Tokens are automatically set in HttpOnly cookies
// 3. Subsequent requests automatically include access token
const articles = await fetch('/api/articles', {
  credentials: 'include'
});
```

### Token Refresh Flow

```javascript
// When access token expires (401 response)
const refreshResponse = await fetch('/api/refresh', {
  method: 'POST',
  credentials: 'include' // Sends refresh_token cookie
});

// New tokens are automatically set in cookies
// Retry original request
```

---

## Support

For API issues or questions:
- Check Swagger UI at `/api/docs`
- Review error messages in responses
- Check server logs for detailed error information

