# Deploy Contract

## Required env

```text
DATABASE_URL=mysql://user:password@mysql:3306/database
```

## Ports

```text
APP_PORT=3001
```

## Commands

```bash
npm install
npm run prisma:generate
npm run db:deploy
npm run db:seed
npm run dev
```

## Health

```text
GET /api/health
```
