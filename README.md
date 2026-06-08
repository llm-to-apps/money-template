# Money Template

Minimal personal finance app for LLAgents templates.

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
```

Useful commands:

```bash
npm run dev
npm run build
npm run typecheck
npm run db:deploy
npm run db:seed
```
