# Money Template

Minimal personal finance app for OS7 templates.

## Stack

- Next.js App Router
- Mantine UI
- MySQL
- Prisma ORM

## UX Contract

Money is an app-like client experience, not an SSR-first dashboard.

The server-rendered page performs auth, routing, and bootstrap work. Dashboard
data is loaded and refreshed through focused JSON APIs from the client. Routine
mutations should use local state, optimistic updates, targeted fetches, and
realtime notifications instead of full route reloads.

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

Useful commands:

```bash
npm run dev
npm run build
npm run typecheck
npm run db:deploy
npm run db:seed
```

Health endpoint:

```text
GET /api/health
```
