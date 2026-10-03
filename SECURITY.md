# Security Notes

PulseCRM is designed as a portfolio-grade reference implementation. It applies several controls that are often missing from demo CRUD applications:

- Passwords are hashed with bcrypt and are never returned by the API.
- Access JWTs are short-lived and stored only in browser memory.
- Persistent refresh credentials use HttpOnly cookies; only token hashes are stored in PostgreSQL.
- Refresh credentials rotate on use and can be revoked on logout.
- Workspace IDs supplied by the client are always checked against server-side membership.
- Role checks are enforced in API routes rather than only by hiding UI controls.
- Invite secrets are returned only to owners/admins.
- Audit history is permission restricted.
- Helmet, constrained CORS, JSON body limits and auth rate limiting are enabled.
- Cookie-authenticated refresh/logout requests reject mismatched browser origins; SameSite behavior is explicitly configurable.
- Google ID tokens are verified server-side against the configured OAuth client audience.

## Before public production use

Add email verification and password recovery, use a dedicated secrets manager, enable HTTPS with `COOKIE_SECURE=true`, configure exact trusted origins, add centralized observability, database backups, dependency scanning and a deployment-specific reverse proxy / same-site cookie strategy.

Do not commit real `.env` files or real OAuth secrets.
