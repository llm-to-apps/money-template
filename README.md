# Money Template

Minimal personal finance app for OS7 templates.

## Stack

- Next.js App Router
- Mantine UI
- MySQL or SQLite
- Prisma ORM

## UX Contract

Money is an app-like client experience, not an SSR-first dashboard.

The server-rendered page performs auth, routing, and bootstrap work. Dashboard
data is loaded and refreshed through focused JSON APIs from the client. Routine
mutations should use local state, optimistic updates, targeted fetches, and
realtime notifications instead of full route reloads.

## Architecture

- `app/` contains Next.js routes, route boundaries, and thin API adapters.
- `src/features/` contains feature schemas, services, and UI components.
- `src/server/` contains database, auth, env, event, resolver, serializer, and
  snapshot code.
- `src/shared/` contains reusable types, schema helpers, result/error contracts,
  and pure utilities.
- `src/mcp/` contains typed MCP tool definitions and registry code.
- Imports should use `@/features`, `@/server`, `@/shared`, and `@/mcp` aliases.

## Development

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run db:deploy
npm run db:seed
npm run dev
```

The local development server listens on:

```text
http://localhost:3005
```

For local development without OS7 OAuth, set:

```text
MONEY_AUTH_MODE=local
MONEY_LOCAL_USER_ID=local-dev-user
MONEY_LOCAL_USER_EMAIL=dev@example.local
MONEY_LOCAL_USER_NAME=Local
MONEY_LOCAL_USER_ROLE=admin
MONEY_DEV_MCP_TOKEN=dev-money-token
```

With `MONEY_DEV_MCP_TOKEN`, local MCP requests can use:

```text
Authorization: Bearer dev-money-token
```

## Runtime Contract

The platform should provide:

```text
DATABASE_URL
APP_PORT=80
```

`DATABASE_URL` selects the database provider used by Prisma commands:

```text
mysql://user:password@localhost:3306/money
file:./dev.db
```

Set `DATABASE_PROVIDER=mysql` or `DATABASE_PROVIDER=sqlite` only when the URL
scheme is not enough.

Useful commands:

```bash
npm run dev
npm run format:check
npm run test
npm run test:coverage
npm run test:e2e
npm run lint
npm run build
npm run typecheck
npm run prisma:validate
npm run db:deploy
npm run db:seed
```

Database-backed Playwright CRUD flows are available when a migrated local
database is configured:

```bash
RUN_DB_E2E=1 MONEY_AUTH_MODE=local npm run test:e2e
```

For a zero-service local database, run the same CRUD flow on SQLite:

```bash
npm run test:e2e:sqlite
```

The SQLite e2e suite covers browser CRUD, direct JSON API CRUD, and MCP
JSON-RPC CRUD against the same real test database.

Coverage thresholds are enforced by `npm run test:coverage`:

```text
statements >= 75%
branches   >= 60%
functions  >= 80%
lines      >= 75%
```

Current local baseline:

```text
statements 80.04%
branches   61.08%
functions  82.35%
lines      80.09%
```

Health endpoint:

```text
GET /api/health
```
