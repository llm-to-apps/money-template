# Money Agent Guide

This file contains project-specific rules for coding agents working on Money.
Read it before making code, database, MCP, or UI changes.

## Product Shape

Money is a personal finance app backed by MySQL and Prisma.

Keep business operations explicit and exposed through the application MCP endpoint:

- `POST /api/mcp`

The platform agent uses this endpoint in Use mode. If a user-facing data action exists in the UI or database, the same action should usually be available as an MCP tool.

## Database Rules

When adding or changing Prisma models:

- Update `prisma/schema.prisma`.
- Add a migration SQL file under `prisma/migrations`.
- Add or update the related application code.
- Add MCP tools for user-facing business operations around the model.
- Update seed data only when useful for a fresh demo app.
- Keep relations explicit and use sensible delete behavior.
- Do not hide missing required tables or columns with UI fallbacks. Fix the schema, migration, generated Prisma client, and seed path instead.

Examples:

- Adding `Wallet` should also add MCP tools such as `listWallets`, `createWallet`, `updateWallet`, and `deleteWallet`.
- Adding a transaction field should update the UI form, transaction queries, MCP schemas, and MCP handlers.

## MCP Rules

MCP tools live in `app/api/mcp/route.ts`.

For every MCP tool:

- Add a clear tool name and description.
- Define an input schema in the tools list.
- Validate arguments in the handler.
- Return business objects, not UI strings.
- Do not expose secrets or raw environment values.
- If the tool mutates data, notify realtime listeners.

For data mutations, call the existing realtime notification helper so the browser updates without refresh.

## Realtime Rules

The UI listens for backend changes through the existing realtime path.

When adding a mutating MCP action or server action:

- Send a realtime notification after the database write succeeds.
- Include a concise action name in the payload, such as `wallet.created` or `category.upserted`.
- Keep the payload small.

## UI Rules

Keep the first screen as the actual money dashboard.

When adding a new model that users manage:

- Add visible UI only when the feature needs direct user interaction.
- Keep forms compact and clear.
- Prefer server actions and Prisma queries that match existing patterns.

## Verification

After code changes, run the most relevant checks available in the container.

Prefer:

- `npm run prisma:generate` after Prisma schema changes
- `npm run typecheck`
- `npm run build` when the change affects routing or production behavior

After Prisma schema changes:

- Run `npm run prisma:generate`.
- Run `npm run typecheck`.
- Restart the supervised app process.
- Inspect app status and logs.
- Do not report success if these checks did not complete. Report exactly what failed or could not be run.

After edits that affect the running app, restart the supervised app process and inspect status/logs if needed.

## Generated Files

Do not intentionally edit generated framework files such as `next-env.d.ts`.
If a tool run changes `next-env.d.ts`, treat it as generated noise and do not present it as a meaningful project change.

## Command Rules

When running commands through agent tools:

- Use the project root by omitting `cwd` or setting `cwd` to `.`.
- Do not pass absolute paths as `cwd`.
- If a command fails because of the tool environment, explain that failure plainly and try the same command again with a relative `cwd` when appropriate.
