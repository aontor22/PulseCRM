-- Run this as a PostgreSQL superuser (normally `postgres`).
-- It creates/repairs the development role expected by apps/api/.env.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crm') THEN
    CREATE ROLE crm LOGIN PASSWORD 'crm';
  ELSE
    ALTER ROLE crm WITH LOGIN PASSWORD 'crm';
  END IF;
END
$$;

SELECT 'CREATE DATABASE crm OWNER crm'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'crm')\gexec

ALTER DATABASE crm OWNER TO crm;

SELECT 'CREATE DATABASE crm_shadow OWNER crm'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'crm_shadow')\gexec

ALTER DATABASE crm_shadow OWNER TO crm;
\connect crm
GRANT ALL ON SCHEMA public TO crm;
ALTER SCHEMA public OWNER TO crm;
