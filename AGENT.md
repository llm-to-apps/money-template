# Money Agent Guide

This file contains project-specific rules for coding agents working on Money.
Read it before making code, database, MCP, or UI changes.

## Default Agent Mode

Most project-agent requests against Money are small targeted edits: add a field,
change a label, adjust a color, fix one form, tweak validation, or expose a
simple data operation. Prefer the smallest safe change that satisfies the user
request.

Do not start routine work by mapping the whole codebase. First inspect only the
files directly related to the requested UI, API route, Prisma model, MCP tool,
or feature service. Broaden the search only when those files do not explain the
behavior.

For small changes:

1. Locate the likely feature, route, schema, or component.
2. Read the smallest surrounding context needed.
3. Edit in the existing style.
4. Run the narrowest relevant check.
5. Report what changed and what was verified.

Avoid unrelated refactors, architecture rewrites, generated-file churn, and
large exploratory edits unless the user explicitly asks. Slow down and broaden
analysis for auth, OAuth, permissions, billing/credits, deployment, background
jobs, shared framework code, destructive migrations, or failures that suggest
cross-module coupling.

## Common Places

- App routes, layouts, route boundaries, and API adapters: `app/`
- Public JSON route handlers: `app/api/**/route.ts`
- MCP endpoint adapter: `app/api/mcp/route.ts`
- Prisma schema and migrations: `prisma/schema.prisma`,
  `prisma/migrations/`
- Seed data: `prisma/seed.ts`
- Money feature modules: `src/features/`
- Feature validation schemas: `src/features/<feature>/schemas.ts`
- Feature business logic and Prisma writes: `src/features/<feature>/service.ts`
- Shared API/result contracts: `src/shared/api.ts`, `src/shared/result.ts`
- Shared schema parsing helpers: `src/shared/schema.ts`
- HTTP response helpers: `src/server/http.ts`
- Server infrastructure, auth, env, db, logging, audit, and realtime helpers:
  `src/server/`
- Typed MCP registry and tool definitions: `src/mcp/`
- App shell and client providers: `app/layout.tsx`, `app/page.tsx`,
  `app/providers.tsx`
- Global and theme styling: `app/globals.css`, `src/theme/`, `src/ui/`
- Tests: colocated `*.test.ts`, Playwright specs under `tests/` or `e2e/`
- E2E SQLite reset path: `npm run test:e2e:sqlite`

## Project Map

Money is organized around thin route adapters, feature modules, shared
contracts, and server-only infrastructure. Use this map before doing broad
searches.

- `app/` is the Next.js App Router surface. It contains route segments, layouts,
  route boundaries, providers, pages, and thin route handlers.
- `app/api/**/route.ts` files are HTTP API entry points. Keep them thin: auth,
  request parsing, service call, and `jsonOk` / `jsonError` response mapping.
- `app/api/mcp/route.ts` is the MCP JSON-RPC endpoint for agent-facing tools.
- `prisma/schema.prisma` is the source of truth for database models.
- `prisma/migrations/` contains production MySQL migrations.
- `prisma/seed.ts` seeds fresh local/demo data.
- `src/features/<feature>/schemas.ts` owns Zod schemas and shared input parsing
  for UI, API, and MCP.
- `src/features/<feature>/service.ts` owns business operations, Prisma writes,
  serialization, audit events, and realtime notifications.
- `src/shared/api.ts` owns public API DTOs and `ApiResponse<T>` shapes.
- `src/shared/result.ts` owns framework-neutral app result/error contracts.
- `src/shared/schema.ts` owns reusable runtime parsing helpers.
- `src/server/http.ts` maps app results/errors to Next JSON responses.
- `src/server/` contains server-only infrastructure such as auth, db, env,
  logging, audit, OAuth, realtime, and integrations.
- `src/mcp/` contains typed MCP tool registries and shared MCP wiring.
- `app/globals.css`, `src/theme/`, and `src/ui/` are the first places to check
  for global styling, theme, and shared UI primitives.

## Task Shortcuts

For adding or changing a transaction field:

1. Update `prisma/schema.prisma`.
2. Add a Prisma migration for MySQL.
3. Update the relevant feature schema in `src/features/<feature>/schemas.ts`.
4. Update service writes, queries, and serialization in
   `src/features/<feature>/service.ts`.
5. Update the form, table, card, detail view, filters, or summaries that show
   the field.
6. Update MCP input/output when the field is user-visible.
7. Run `npm run prisma:generate`, `npm run db:deploy`, and `npm run typecheck`.

For changing dashboard UI:

1. Start with `app/page.tsx` and the dashboard-related feature components.
2. Check client data fetch hooks only if the displayed data shape changes.
3. Prefer Mantine and OS7 UI kit primitives before adding custom CSS.
4. Verify mobile and desktop layouts for visible UI changes.

For adding a simple CRUD model:

1. Update `prisma/schema.prisma` and add a migration.
2. Add or update `src/features/<feature>/schemas.ts`.
3. Add or update `src/features/<feature>/service.ts`.
4. Add thin API route adapters under `app/api/**/route.ts` if browser HTTP
   access is needed.
5. Add MCP tools for user-facing create/read/update/delete operations.
6. Add compact UI only where users directly manage the model.

For API response changes:

1. Start at the relevant `app/api/**/route.ts` adapter.
2. Keep public JSON responses on `ApiResponse<T>`.
3. Use `jsonOk`, `jsonError`, and `jsonErrorFromUnknown` from
   `src/server/http.ts`.
4. Keep DTOs in `src/shared/api.ts` or feature-local shared types when narrower.

For MCP behavior changes:

1. Start at `app/api/mcp/route.ts` and the related `src/mcp/` registry.
2. Reuse feature schemas from `src/features/<feature>/schemas.ts`.
3. Execute mutations through `src/features/<feature>/service.ts`.
4. Ensure mutating tools publish the same realtime invalidation as UI/API
   mutations.

For auth, OAuth, or session changes:

1. Slow down and inspect the relevant files under `src/server/auth`,
   `src/server/oauth`, and auth/OAuth route handlers.
2. Check redirects, cookies, callback URLs, and safe error handling.
3. Do not make broad auth changes without targeted verification.

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
- Keep public API DTO types in `src/shared/api.ts`, pure app result/error logic
  in `src/shared/result.ts`, and Next response helpers in `src/server/http.ts`.
- Implement app internationalization with `next-intl`. Keep supported locales,
  locale guards, and locale detection helpers under `src/i18n/`; keep locale
  messages in `messages/<locale>.json`; provide translations to Client
  Components through `NextIntlClientProvider`; use `useTranslations` in Client
  Components and `getTranslations` in Server Components, route boundaries, and
  metadata.
- Do not add locale prefixes to app routes unless the product specification
  explicitly requires localized URLs. For OS7 app-style templates, keep routes
  stable (`/`, `/transactions`, `/wallets`, etc.), store the selected locale in
  a cookie or app state, and fall back to `Accept-Language`.
- If an app supports query-parameter locale handoff, treat `?lang=<locale>` as
  higher priority than the cookie and `Accept-Language`; validate the locale,
  apply it to the current request, and persist it immediately to the locale
  cookie.
- When adding or changing user-facing UI, update all supported locale message
  files in the same change. User-facing UI includes navigation, app display
  names, metadata, labels, placeholders, buttons, empty states, loading text,
  auth screens, error states, validation copy, table headers, chart labels, and
  action menu labels.
- Format dates, numbers, lists, and currencies with the active locale. Avoid
  hardcoded locale strings such as `en-US` inside shared UI utilities unless
  they are explicit fallbacks.
- Do not translate user-authored or persisted business data such as wallet
  names, category names, comments, transaction notes, imported records, or
  stable API/MCP/database/audit identifiers.
- Do not use misleading collection names. A bounded page of transactions must be
  named like `initialTransactionsPage`, not `transactions`.
- Large lists must be bounded and cursor-paginated before they can grow without
  limit.
- API routes should be thin adapters: auth, request parsing, service call,
  audit/realtime wiring, and response.
- UI, API, and MCP paths should reuse the same feature service layer.
- Public Money JSON APIs must use `ApiResponse<T>` from `src/shared/api.ts`:
  `{ ok: true, data: T }` for success and
  `{ ok: false, error: { code, message, details? } }` for errors. Use the shared
  `jsonOk`, `jsonError`, and `jsonErrorFromUnknown` helpers from
  `src/server/http.ts` instead of returning raw DTOs from public JSON routes.
  OAuth redirects, SSE events, form redirects, and MCP JSON-RPC are documented
  exceptions.

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
- Use `src/server/http.ts` for HTTP response helpers instead of custom per-route
  response envelopes.
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
