# Psy App MVP

MVP for psychologists: React frontend + Node.js backend with cookie + JWT auth.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Auth: access token as JWT bearer + refresh token in httpOnly cookie
- Orchestration: Docker Compose (dev)

## Quick Start

### 1. Configure env files

Copy env examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Run with Docker

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- PostgreSQL: localhost:5432

## Local Run Without Docker

Install deps and start both apps:

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Auth Flow

1. `POST /auth/register` creates user.
2. `POST /auth/login` returns `accessToken` and sets `refreshToken` cookie.
3. Frontend sends `Authorization: Bearer <accessToken>` to protected routes.
4. When access token expires, frontend calls `POST /auth/refresh` with cookie.
5. `POST /auth/logout` clears refresh cookie and revokes session.
