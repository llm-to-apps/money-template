# Money Agent Guide

This file contains project-specific rules for coding agents working on Money.
Read it before making code, database, MCP, or UI changes.

## Product Shape

Money is a personal finance app backed by MySQL and Prisma.

Money should feel like a modern app-like client experience, not an SSR-first
dashboard. The server-rendered page should do auth, routing, and bootstrap work.
Ordinary dashboard data should be loaded and refreshed through focused JSON APIs
from the client. Use local state, optimistic updates, targeted fetches, and
realtime notifications for routine workflows.

Do not reintroduce server-rendered dashboard data as the default path for normal
Money state. SSR is acceptable for auth gates, redirects, static shell content,
and rare whole-route state changes that are explicitly justified.

Keep business operations explicit and exposed through the application MCP endpoint:

- `POST /api/mcp`

The platform agent uses this endpoint in Use mode. If a user-facing data action exists in the UI or database, the same action should usually be available as an MCP tool.

## Database Rules

When adding or changing Prisma models:

- Update `prisma/schema.prisma`.
- Add or update the related application code.
- Add MCP tools for user-facing business operations around the model.
- Update seed data only when useful for a fresh demo app.
- Keep relations explicit and use sensible delete behavior.
- Do not hide missing required tables or columns with UI fallbacks. Fix the schema, generated Prisma client, and seed path instead.
- Keep this template migration-free. For a fresh local or deployed database,
  `npm run db:deploy` pushes the current Prisma schema directly.

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
- Use realtime notifications to update focused client state or fetch a small JSON snapshot. Do not refresh or reload the whole route for ordinary data changes.

## UI Rules

Keep the first screen as the actual money dashboard.

Money uses Mantine as the UI framework. Prefer Mantine components directly from
`@mantine/core` and `@mantine/hooks` instead of building local component
wrappers. Do not reintroduce Tailwind, shadcn/ui, Radix wrapper components, or a
custom local UI kit for ordinary controls, tables, modals, menus, layout, or
forms.

Always check for an existing Mantine or official Mantine-compatible component
before implementing UI behavior locally. Standard controls and patterns such as
date inputs, selects, tables, drawers, modals, popovers, menus, notifications,
AppShell layout, cards, and buttons must use framework components by default.
Custom UI code is a last resort when no suitable framework component exists or
when required product behavior cannot be composed from Mantine primitives.

When adding a new model that users manage:

- Add visible UI only when the feature needs direct user interaction.
- Keep forms compact and clear.
- Use Mantine form controls, tables, cards, modals, menus, notifications, and
  AppShell primitives before writing custom CSS or custom interaction code.
- Keep common CRUD interactions smooth: use local state, optimistic updates, or targeted API fetches so forms do not reload the whole view.
- Avoid `window.location.reload()`, periodic full-page polling, and `router.refresh()` as the default update mechanism for routine mutations. Use them only for rare whole-route state changes and explain why.

## Verification

After code changes, run the most relevant checks available in the container.

Prefer:

- `npm run prisma:generate` after Prisma schema changes
- `npm run typecheck`
- `npm run build` when the change affects routing or production behavior

After Prisma schema changes:

- Run `npm run prisma:generate`.
- Run `npm run db:deploy` against the intended development database.
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
