# Money Template

Minimal personal finance app for OS7 templates.

## Stack

- Next.js App Router
- MySQL
- Prisma ORM

## Development

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run db:deploy
npm run db:seed
npm run dev
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
