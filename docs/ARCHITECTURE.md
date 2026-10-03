# PulseCRM Architecture

## Request flow

```text
React/Vite SPA
   │
   ├── Authorization: Bearer <15m access token>
   ├── x-organization-id: <active workspace>
   │
Express API
   │
   ├── requireAuth() verifies JWT + reloads user
   ├── requireOrg() verifies membership + minimum role
   │
Prisma ORM 7 + pg adapter
   │
PostgreSQL 17
```

Persistent authentication uses a separate random refresh credential in an HttpOnly cookie. The database stores only its SHA-256 hash. Refresh rotates the credential and extends the configured 30-day session window.

## Tenant boundary

Workspace-owned tables contain `organizationId`. The frontend sends the active organization ID, but the server treats it only as a requested tenant and verifies that the authenticated user has a `Membership` row before executing tenant queries.

The role hierarchy is:

```text
OWNER > ADMIN > MANAGER > MEMBER
```

Owners control admin roles. Owners/admins control workspace settings and invite secrets. Managers can review audit history and perform destructive lead operations. Members can work with ordinary lead/task workflows.

## Main models

- `User`: identity and optional password / Google identity
- `Session`: hashed refresh session and expiry metadata
- `Organization`: tenant/workspace
- `Membership`: user-to-tenant role mapping
- `Lead`: CRM prospect/opportunity record
- `Task`: work item, optionally linked to a lead and assignee
- `AuditLog`: important server-side workspace events

## Frontend structure

```text
src/
├── components/      reusable shell, modal, route guard
├── context/         auth + active workspace state
├── lib/             API client and refresh coordination
├── pages/           dashboard, leads, tasks, team, audit, settings
├── App.tsx          routing
└── styles.css       responsive design system
```

## Backend structure

```text
src/
├── lib/             config, Prisma, crypto/session, audit helpers
├── middleware/      authentication, tenant/RBAC, errors
├── routes/          auth, organizations, leads, tasks, dashboard, audit
├── seed.ts          demo data
└── server.ts        Express composition and lifecycle
```
