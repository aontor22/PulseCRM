# Windows local PostgreSQL setup (Docker not required)

The project defaults to:

```env
DATABASE_URL=postgresql://crm:crm@localhost:5432/crm?schema=public
SHADOW_DATABASE_URL=postgresql://crm:crm@localhost:5432/crm_shadow?schema=public
```

The `crm_shadow` database is only used when you intentionally run `npm run db:migrate:dev` to author a new migration. Normal project setup uses the committed migrations through `npm run db:migrate` (`prisma migrate deploy`) and does not require a shadow database.

If Docker is not installed but PostgreSQL is already running on port `5432`, create the matching development role/database once. The supplied SQL also creates the optional `crm_shadow` database for Prisma development migrations.

## Option A — psql

Open PowerShell or Git Bash from the project root and run:

```bash
psql -U postgres -f scripts/setup-local-postgres.sql
```

PostgreSQL will ask for the password you chose for the `postgres` administrator account during installation.

If `psql` is not in PATH, use the executable directly, for example:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -f scripts/setup-local-postgres.sql
```

The leading `&` is **PowerShell syntax**. Do not paste that form into Git Bash. In Git Bash, either use `psql` from PATH or quote the executable path without PowerShell's call operator. Adjust `17` to your installed PostgreSQL version.

## Option B — keep your existing PostgreSQL user

Instead of creating `crm/crm`, edit `apps/api/.env` and use your real username/password/database:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/crm?schema=public
```

Create the `crm` database first if it does not exist. If your password contains characters such as `@`, `:`, `/`, `?`, or `#`, URL-encode the password in the connection string.

## Verify before migrating

```bash
npm run db:check
```

Expected output:

```text
Database connection OK.
```

Then run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```


## When changing `schema.prisma`

Initial setup should use `npm run db:migrate`. If you later change the Prisma schema and need Prisma to create a new migration, first make sure `SHADOW_DATABASE_URL` exists in `apps/api/.env`, then run:

```bash
npm run db:migrate:dev
```

Never point `SHADOW_DATABASE_URL` at the same database as `DATABASE_URL`. Prisma resets the configured shadow database while calculating migrations.
