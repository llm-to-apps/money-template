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

## Engineering Contract

Money follows the baseline engineering practices expected for OS7 apps built by
AI agents.

- Use Next.js App Router only.
- Keep `app/` as route, layout, provider, route boundary, and API adapter code.
- Keep business feature modules under `src/features/<feature>/`.
- Keep server-only infrastructure under `src/server/`.
- Keep framework-neutral types, schema helpers, result contracts, and pure
  utilities under `src/shared/`.
- Keep typed MCP registry and tool definitions under `src/mcp/`.
- Use `@/features`, `@/server`, `@/shared`, and `@/mcp` path aliases instead of
  long relative imports.
- Use typed runtime validation for route, service, and MCP inputs.
- Use `src/shared/result.ts` and typed `AppException` / `AppError` contracts for
  HTTP error mapping.
- Do not use misleading collection names. A bounded page of transactions must be
  named like `initialTransactionsPage`, not `transactions`.
- Large lists must be bounded and cursor-paginated before they can grow without
  limit.
- API routes should be thin adapters: auth, request parsing, service call,
  audit/realtime wiring, and response.
- UI, API, and MCP paths should reuse the same feature service layer.
- Public Money JSON APIs must use `ApiResponse<T>` from `src/shared/result.ts`:
  `{ ok: true, data: T }` for success and
  `{ ok: false, error: { code, message, details? } }` for errors. Use the shared
  `jsonOk`, `jsonError`, and `jsonErrorFromUnknown` helpers instead of returning
  raw DTOs from public JSON routes. OAuth redirects, SSE events, form redirects,
  and MCP JSON-RPC are documented exceptions.

## Database Rules

When adding or changing Prisma models:

- Update `prisma/schema.prisma`.
- Add or update the related feature module under `src/features/<feature>/`.
- Keep validation and input parsing in `src/features/<feature>/schemas.ts`.
- Use shared Zod-backed helpers from `src/shared/schema.ts` for runtime parsing.
- Keep business operations, Prisma writes, serialization, and realtime mutation
  notifications in `src/features/<feature>/service.ts`.
- Keep API route handlers thin: auth, request parsing, service call, response.
- Use `@/features`, `@/server`, `@/shared`, and `@/mcp` path aliases instead of
  long relative imports.
- Use `src/shared/result.ts` for HTTP error mapping instead of custom per-route
  error envelopes.
- Add MCP tools for user-facing business operations around the model.
- Update seed data only when useful for a fresh demo app.
- Keep relations explicit and use sensible delete behavior.
- Do not hide missing required tables or columns with UI fallbacks. Fix the schema, generated Prisma client, and seed path instead.
- Keep production schema changes migration-backed. For MySQL, create Prisma
  migrations and apply them with `npm run db:deploy`.
- SQLite remains a local/e2e convenience provider and uses `npm run db:push`
  through the test reset scripts.
- CI should apply MySQL migrations, not `prisma db push`, for the production
  provider.
- SQLite-backed e2e should stay service-free and reset through
  `npm run db:test:reset`.

Examples:

- Adding `Wallet` should also add MCP tools such as `listWallets`, `createWallet`, `updateWallet`, and `deleteWallet`.
- Adding a transaction field should update the UI form, transaction queries, MCP schemas, and MCP handlers.

## MCP Rules

MCP tools live in `app/api/mcp/route.ts`.

For every MCP tool:

- Add a clear tool name and description.
- Define the input schema in the related feature `schemas.ts` file and reuse it
  in the tools list.
- Validate and parse arguments through the feature schema/service layer.
- Execute business operations through the related feature service.
- Return business objects, not UI strings.
- Do not expose secrets or raw environment values.
- If the tool changes user-visible data or runtime-visible state, notify
  realtime listeners after the mutation commits.

For data mutations, call the existing realtime notification helper so the browser updates without refresh. MCP, API, and UI actions that perform the same mutation must reuse the same service-layer path so validation, audit logging, and realtime notifications cannot drift.

## Realtime Rules

The UI listens for backend changes through the existing realtime path.

When adding a mutating MCP action or server action:

- Send a realtime notification after the database write succeeds.
- Include a concise action name in the payload, such as `wallet.created` or `category.upserted`.
- Keep the payload small.
- Use realtime notifications to update focused client state or fetch a small JSON snapshot. Do not refresh or reload the whole route for ordinary data changes.
- Do not rely on periodic polling as the primary way to notice MCP-driven
  mutations. The MCP path must actively publish the same UI invalidation signal
  as the browser/API mutation path.

## Logging And Audit Rules

Money should keep runtime logs structured and safe. Use the existing server
logger/audit helpers instead of adding scattered raw `console.log` calls in
feature services, API routes, MCP handlers, or Prisma-heavy code.

For server operations, log stable lifecycle events where useful:

- `<operation>.started`
- `<operation>.finished`
- `<operation>.failed`

When `SENTRY_DSN` is configured, Money must forward server-side unexpected
errors to Sentry in addition to writing structured runtime logs. Sentry reporting
must remain optional and must redact tokens, cookies, OAuth codes, OAuth state,
secrets, provider payloads, SQL details, and large finance payloads.

Include available context such as `requestId`, `userId`, operation name, record
type/id, status, and `elapsedMs`. For MCP actions, log the tool name, status, and
duration, but do not dump raw arguments or full result payloads when they may
contain personal finance data.

Never log secrets or raw credentials. Logs must not include auth tokens, cookies,
OAuth codes, API keys, database passwords, full connection strings, private
headers, or unredacted environment values.

Business mutations should keep using persistent audit events in addition to
runtime logs. Audit events are the accountability trail; runtime logs are for
debugging and operations.

User-facing errors should stay concise and safe. Do not expose stack traces,
provider payloads, SQL details, tokens, or implementation-specific log context in
UI/API/MCP responses.

## UI Rules

Keep the first screen as the actual money dashboard.

Money uses Mantine and the OS7 UI kit as its UI foundation. Prefer OS7 UI kit
brand/theme helpers and Mantine components directly from `@mantine/core` and
`@mantine/hooks` instead of building local component wrappers. Do not reintroduce
Tailwind, shadcn/ui, Radix wrapper components, or a custom local UI kit for
ordinary controls, tables, modals, menus, layout, or forms.

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

- `npm run format:check`
- `npm run prisma:generate` after Prisma schema changes
- `npm run prisma:validate`
- `npm run test`
- `npm run test:coverage` when changing services, routes, or shared contracts
- `npm run lint`
- `MONEY_AUTH_MODE=local npm run test:e2e` after UI/app shell changes
- `npm run test:e2e:sqlite` after changes to real database UI/API/MCP flows
- `npm run typecheck`
- `npm run build` when the change affects routing or production behavior

Coverage is enforced with practical baseline thresholds. Raise thresholds only
after adding meaningful tests that keep the app easy to maintain.

After Prisma schema changes:

- Run `npm run prisma:generate`.
- Run `npm run db:deploy` against MySQL, or `npm run db:push` for SQLite local
  test databases.
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
