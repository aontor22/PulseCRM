# PulseCRM — Multi-Tenant SaaS CRM

A portfolio-grade CRM built to demonstrate production-oriented full-stack engineering: secure authentication, 30-day persistent sessions, multi-tenant authorization, RBAC, PostgreSQL, CRUD workflows, audit trails, responsive UI and Docker-based local development.

## Stack

- **Frontend:** React 19, TypeScript, Vite, React Router, Lucide icons
- **Backend:** Node.js, Express 5, TypeScript, Zod
- **Database:** PostgreSQL 17 + Prisma ORM 7
- **Auth:** Email/password, optional Google Identity, 15-minute access JWT, rotating 30-day HttpOnly refresh sessions
- **Security:** Helmet, CORS, auth rate limiting, bcrypt, hashed refresh tokens, server-side tenant membership checks, RBAC

## Features

- Register / login / logout / automatic session restore
- Optional Google Sign-In (`VITE_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_ID`)
- Create or join workspaces using invite codes
- Multi-workspace account support and workspace switcher
- OWNER / ADMIN / MANAGER / MEMBER role model
- Lead pipeline with search, stages, values, ownership and CRUD
- Kanban-style tasks linked to leads and teammates
- Dashboard metrics and pipeline summary
- Team role management and invite-code rotation
- Server-side audit log
- Responsive desktop/mobile UI
- Seeded demo workspace

## Quick start

### 1. Requirements

- Node.js 22+
- npm 10+
- Docker Desktop / Docker Engine **or** a local PostgreSQL 17+ installation

### 2. Environment

From the repository root:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

For local development, the defaults already target `localhost` PostgreSQL and the local frontend/API.

### 3. Start PostgreSQL

Choose **one** database option.

**Option A — Docker:**

```bash
docker compose up -d db
```

**Option B — Windows local PostgreSQL (no Docker):**

If PostgreSQL is already installed locally, follow [`docs/WINDOWS_LOCAL_POSTGRES.md`](docs/WINDOWS_LOCAL_POSTGRES.md). The supplied SQL creates the development `crm` role/database expected by the default `.env`.

### 4. Install dependencies

```bash
npm install
```

### 5. Verify DB, create tables and seed demo data

```bash
npm run db:check
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` applies the committed migrations with `prisma migrate deploy`, so initial setup does not require permission to create a temporary database. When you intentionally change `schema.prisma` during development, use `npm run db:migrate:dev`; the local setup script also creates the dedicated `crm_shadow` database used by Prisma Migrate.

### 6. Run frontend + backend

```bash
npm run dev
```

Open: **http://localhost:5173**

Demo account:

```text
admin@example.com
Demo12345!
```

Seed invite code: `ACME2026`

## Google Sign-In

Create a Google OAuth 2.0 Web Client. Add `http://localhost:5173` as an authorized JavaScript origin, then place the same client ID in:

```env
# apps/api/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# apps/web/.env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Restart both apps after changing env files.

## Authentication design

The browser keeps the short-lived access token only in memory. A random refresh token is stored in an HttpOnly cookie and only its SHA-256 hash is stored in PostgreSQL. Refreshing rotates that token and extends the session up to the configured 30-day sliding window. Closing and reopening the browser therefore keeps the user signed in without exposing the persistent credential to JavaScript.

## Multi-tenant authorization

Every lead/task/dashboard/audit API request includes `x-organization-id`. The API does **not** trust that header by itself: it verifies the authenticated user's membership before reading or writing tenant data. Administrative routes additionally verify role rank.

## Useful commands

```bash
npm run dev
npm run build
npm run test
npm run db:check
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Production checklist

Before production deployment:

1. Use a managed PostgreSQL database and strong `ACCESS_TOKEN_SECRET`.
2. Set `COOKIE_SECURE=true`, choose an explicit `COOKIE_SAME_SITE` policy and use HTTPS-only origins.
3. Set `WEB_ORIGIN` to the exact deployed frontend origin.
4. Use `npm run db:migrate` / `prisma migrate deploy` in release pipelines. Use `npm run db:migrate:dev` only while authoring new migrations locally.
5. Configure Google OAuth only for your real domains.
6. Add email verification/password reset provider if public signup is enabled.
7. Add centralized logs/metrics and backups for the database.

## Production-like Docker demo

You can also build the API and static frontend containers together:

```bash
export ACCESS_TOKEN_SECRET="replace-with-a-random-secret-longer-than-32-characters"
docker compose -f docker-compose.prod.yml up --build
```

Then open **http://localhost:8080**. This compose file is for a local production-like demo; use managed secrets, HTTPS and a managed database for an actual deployment.

## Repository quality

- `.github/workflows/ci.yml` verifies migrations, tests and builds on pushes/PRs.
- `SECURITY.md` documents the security boundary and production gaps.
- `docs/ARCHITECTURE.md` explains the request flow, tenant isolation and code layout.
