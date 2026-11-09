# Salon Platform — Separated Local Testing

This package contains two separate applications:

- `salon-management-system/` — the operational salon application.
- `administration-system/` — the platform/master administration application.

They run as separate Node/Next.js applications but intentionally use the same PostgreSQL database (`salon_system`) for the current multi-tenant design.

## Ports

- Salon frontend: http://localhost:3000
- Salon backend: http://localhost:5001
- Administration: http://localhost:3002

## Local setup

### 1. PostgreSQL
Create a database called `salon_system` and make sure PostgreSQL is running.

### 2. Salon backend
Open `salon-management-system/backend`:

```text
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### 3. Salon frontend
Open `salon-management-system/frontend`:

```text
copy .env.local.example .env.local
npm install
npm run dev
```

### 4. Administration system
Open `administration-system`:

```text
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name administration_init
npm run seed
npm run dev -- -p 3002
```

Before starting Administration, ensure `SALON_SYSTEM_URL="http://localhost:3000"` and `TENANT_SSO_SECRET` matches the Salon backend `.env`.

## Test accounts

### Salon
- `admin.abc` / `admin123`
- `admin.xyz` / `admin123`
- branch cashiers use `cashier.<branch-code>` / `cashier`

### Administration
- `admin@localhost.test` / `54321`

## What to test

1. Open Administration at port 3002 and login as Super Admin.
2. Confirm ABC Salon and XYZ Beauty Spa appear.
3. Open a company and test Edit.
4. Test Suspend and Activate.
5. Test Enter System. It should open the Salon application on port 3000 through the signed SSO flow.
6. In Salon, login as `admin.abc` and confirm only ABC branches/data are visible.
7. Login as `admin.xyz` and confirm only XYZ data is visible.
8. Suspend a company from Administration and verify its Salon access is blocked.
9. Create a new company from Administration. Email/WhatsApp can remain unconfigured during local testing; the activation URL is returned by the API for testing.

## Important architecture boundary

Administration owns platform-level concerns: companies, subscriptions, platform payments, platform admins, sub-admin assignments and audit logs.

Salon Management owns operational concerns: branches, staff, customers, services, rooms, sessions and salon transactions.

The PostgreSQL database is shared, but the applications and their responsibilities are separated.
