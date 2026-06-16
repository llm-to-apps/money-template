# Money TODO

## Architecture

- [x] Use Next.js App Router only.
- [x] Keep `app/` as route, layout, provider, boundary, and API adapter code.
- [x] Move business feature code into `src/features/`.
- [x] Move server-only infrastructure into `src/server/`.
- [x] Move shared types, utilities, schema helpers, and result contracts into
      `src/shared/`.
- [x] Move MCP type and tool registry code into `src/mcp/`.
- [x] Add path aliases for `@/features`, `@/server`, `@/shared`, and `@/mcp`.
- [x] Remove legacy `app/lib/*` modules.
- [x] Remove legacy `app/ui/*` compatibility exports.
- [x] Split `src/server/money.ts` into snapshot, resolvers, filters, and
      serializers.
- [x] Split `money-views.tsx` into feature views.
- [x] Split `money-dashboard.tsx` into shell, hooks, and controller.

## Validation And Contracts

- [x] Add Zod-backed schema helpers.
- [x] Use feature-level schema modules for wallets, categories, and
      transactions.
- [x] Add `AppResult` / `AppError` contract.
- [x] Standardize HTTP error mapping.
- [x] Add typed MCP tool registry.
- [x] Add cursor pagination contract for transaction lists.
- [x] Add typed env validation.
- [x] Support MySQL and SQLite through Prisma schema generation.
- [ ] Review whether every remaining parser should be fully schema-first or can
      stay as small helper-based parsing.

## API And Services

- [x] Move API routes to direct imports from `src/server` and `src/features`.
- [x] Keep API routes as thin adapters.
- [x] Reuse the same service layer from UI, API, and MCP paths.
- [x] Add mutation guard for auth, request id, and rate limiting.
- [x] Add structured logger baseline.
- [x] Add persistent audit events with `AuditEvent`.
- [x] Add realtime event notifications after writes.
- [ ] Add a production storage adapter for rate limiting, such as Redis.
- [ ] Expand persistent audit querying/reporting if users need audit history in
      the UI.

## UI

- [x] Add route boundaries: `loading`, `error`, and `not-found`.
- [x] Keep app shell consistent across desktop and mobile.
- [x] Split dashboard panels from route view logic.
- [x] Split transaction, wallet, and category views.
- [x] Add cursor-based infinite scroll loading to the transaction table.
- [x] Add mobile signed-out Playwright check.
- [ ] Add deeper visual regression or screenshot checks for core app screens.
- [ ] Reduce chart warnings in headless/dev rendering when chart containers are
      briefly unmeasured.

## MCP

- [x] Expose wallet CRUD tools.
- [x] Expose category CRUD tools.
- [x] Expose transaction CRUD tools.
- [x] Expose compact summary tool.
- [x] Remove legacy compatibility aliases.
- [x] Add MCP registry tests.
- [x] Add MCP route tests.
- [x] Add real SQLite-backed MCP e2e CRUD flow.
- [x] Add MCP cursor support for large transaction lists.
- [ ] Add cursor pagination to other MCP lists if wallets/categories grow beyond
      current bounded result needs.

## Testing

- [x] Add Vitest.
- [x] Add unit tests for schemas.
- [x] Add service tests.
- [x] Add API route tests.
- [x] Add MCP unit and route tests.
- [x] Add server tests for filters, resolvers, serializers, snapshot,
      rate-limit, audit, and result helpers.
- [x] Add typed test factories.
- [x] Add Playwright critical flows.
- [x] Add real SQLite-backed browser CRUD e2e.
- [x] Add real SQLite-backed JSON API CRUD e2e.
- [x] Add real SQLite-backed MCP CRUD e2e.
- [x] Add `db:test:reset`.
- [x] Add `test:watch`.
- [x] Add `test:coverage`.
- [x] Add coverage thresholds.
- [ ] Add more wallet/category/transaction service edge cases.
- [ ] Add direct tests for OAuth callback edge cases.

## Coverage

- [x] Add V8 coverage provider.
- [x] Generate text, JSON, HTML, and lcov coverage reports.
- [x] Ignore generated coverage artifacts.
- [x] Enforce coverage thresholds:
  - statements `75%`
  - branches `60%`
  - functions `80%`
  - lines `75%`
- [x] Current measured baseline:
  - statements `80.04%`
  - branches `61.08%`
  - functions `82.35%`
  - lines `80.09%`
- [ ] Raise thresholds after adding more service and route edge-case tests.

## CI

- [x] Add GitHub Actions workflow.
- [x] Run install, Prisma generate, Prisma validate, format check, audit check,
      tests, coverage, lint, typecheck, build, and Playwright.
- [x] Add MySQL service for migration verification.
- [x] Run MySQL migrations in CI.
- [x] Run SQLite real database e2e in CI.
- [x] Upload coverage artifact.
- [ ] Add optional MySQL-backed integration/e2e job if provider-specific
      behavior becomes important.

## Tooling

- [x] Add ESLint.
- [x] Add Prettier.
- [x] Add `.editorconfig`.
- [x] Add `.prettierignore`.
- [x] Add `.gitignore` rules for Playwright, coverage, generated Prisma schema,
      and SQLite databases.
- [x] Add `prisma:validate`.
- [x] Add `audit:check`.
- [x] Add dependency audit policy.
- [ ] Review npm install-script approvals periodically.

## Database

- [x] Keep MySQL as production-compatible provider.
- [x] Add SQLite support for local and e2e workflows.
- [x] Add generated Prisma schema wrapper.
- [x] Add `AuditEvent` model.
- [x] Add production MySQL Prisma migrations.
- [x] Keep SQLite local/e2e reset on `prisma db push`.

## Documentation

- [x] Update Money README.
- [x] Update Money SPEC.
- [x] Update Money AGENT rules.
- [x] Add Money AUDIT policy.
- [x] Update shared template rules to require real database e2e tests.
- [ ] Add screenshots or short usage examples for the final Money UI if needed
      for handoff.

## Known External Items

- [ ] Track npm audit moderate warning from `postcss` through `next`.
- [ ] Avoid `npm audit fix --force` unless handled as a dedicated dependency
      upgrade task.
