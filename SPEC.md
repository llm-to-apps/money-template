# Money Specification

Money is an OS7 personal finance app for tracking income, expenses, wallets,
categories, and monthly cash flow. The app must feel like a modern mobile-first
client application while staying simple enough for agents to safely extend.

## Goals

- Let users record income and expense transactions quickly.
- Track money by wallet, such as card, cash, bank account, or custom wallets.
- Show a clear home dashboard with balance, monthly dynamics, and category
  breakdowns.
- Support hierarchical categories, such as `Car / Fuel` and `Car / Repair`.
- Expose the same business data through bounded MCP tools so OS7 agents can
  create, edit, delete, search, and summarize Money data.

## Non-Goals

- Money is not a full accounting system.
- Money does not need double-entry accounting in the first production version.
- Money should not expose unbounded raw datasets to the UI or MCP.
- Money should not depend on OS7 OAuth for local development.

## UX Principles

- Money uses Mantine as its UI framework. Use Mantine components and default
  behavior before adding custom CSS or local UI abstractions.
- Always use ready-made framework components for standard UI patterns. Forms,
  date pickers, selects, tables, modals, menus, drawers, notifications, layout,
  and navigation should come from Mantine or official Mantine-compatible
  packages before any local implementation is considered.
- Custom UI code is allowed only when the framework has no suitable component or
  when product behavior cannot be composed from existing Mantine primitives. In
  that case, keep the custom layer small and document why it exists.
- Tailwind, shadcn/ui, and custom local UI-kit controls are not part of the Money
  implementation.
- Mobile-first is mandatory. Every core workflow must work on narrow mobile
  viewports before desktop polish is considered complete.
- The first screen is the usable finance dashboard, not a marketing or landing
  page.
- The app shell must contain:
  - header with logo or mark, primary menu, and current user area
  - main content area for the primary workflow
  - footer for secondary status or metadata
- Routine actions should feel app-like: optimistic updates, focused refreshes,
  and realtime updates instead of full page reloads.
- The dashboard should be readable at a glance and should prioritize the next
  useful action.

## Motion And Interaction

Money should use calm, consistent motion to make the interface feel responsive
and native-like.

Required motion behavior:

- controls should have smooth hover, focus, active, disabled, and loading
  transitions
- cards and panels may softly enter when dashboard data appears
- newly added transactions should appear without a harsh layout jump
- errors should be shown with a short, non-distracting transition
- loading and saving states should be visible without blocking the whole app
- all animations must respect `prefers-reduced-motion`

Motion should stay practical and quiet. Money is a finance tool, so avoid
playful bounce, long decorative animation, or motion that slows common work.

## Core Features

### Transactions

Users can create, read, update, delete, list, and search transactions.

Each transaction must support:

- type: income or expense
- amount in minor currency units
- occurred date
- wallet
- category or subcategory
- optional note
- creation and update timestamps

Recommended additions:

- transfer transactions between wallets
- optional merchant/payee field
- optional attachments or receipt references
- optional tags for cross-cutting labels
- duplicate transaction action
- quick-add presets for frequent transactions

### Wallets

Users can create, edit, archive, delete, list, and search wallets.

Each wallet should support:

- name
- optional comment, such as card, cash, bank, savings, crypto, or usage notes
- currency
- optional initial balance
- status enum: `ACTIVE` or `ARCHIVED`
- display color or icon

Rules:

- Deleting a wallet with transactions must be restricted with a clear error.
  Archive behavior must be an explicit status change to `ARCHIVED`.
- Archived wallets should remain visible in historical reports but hidden from
  default quick-add flows.
- Transfers between wallets should not be counted as income or expenses in
  monthly cash-flow summaries.

### Categories And Subcategories

Users can create, edit, archive by changing status to `ARCHIVED`, delete, list,
and search categories.

Categories must support hierarchy:

- top-level category, for example `Car`
- subcategory, for example `Car / Fuel`
- subcategory, for example `Car / Repair`

Each category should support:

- name
- optional parent category
- type scope: income, expense, or both
- color or icon
- active or archived status

Rules:

- Deleting a category with transactions should be restricted or converted to
  archive behavior.
- Reports should support grouping by top-level category and by exact
  subcategory.
- Transaction forms should make parent/subcategory selection fast on mobile.

### Dashboard

The home dashboard must show:

- total balance across active wallets
- income, expenses, and net cash flow for the current month
- month-over-month dynamics
- category breakdown for the selected period
- recent transactions
- quick add transaction form

Recommended additions:

- wallet balance cards
- monthly trend chart
- category spending chart
- top changing categories compared with previous month
- date period selector, such as current month, previous month, year to date, or
  custom range

### Search And Filters

Users and agents should be able to filter transactions by:

- date range
- wallet
- category
- parent category
- type
- amount range
- note, merchant, payee, or text query

Lists must be bounded by default and support explicit limits. Large exports
should be produced as files or background jobs, not raw UI or MCP payloads.

## Advanced Features

These are recommended after the core model is stable:

- budgets by month, category, wallet, or tag
- recurring transactions, such as salary, rent, subscriptions, and loans
- reminders for expected bills
- import from CSV
- export to CSV or JSON
- multi-currency support with stored exchange rates
- transaction rules for auto-categorization
- audit log for sensitive changes
- soft delete or archive for important financial records

## Data Model

Target entities:

- User
- Session
- Wallet
- Category
- Transaction
- Transfer
- Budget
- RecurringTransaction
- Tag
- TransactionTag
- ImportJob

Minimum next schema expansion:

- Add `Wallet`.
- Add `walletId` to `Transaction`.
- Add `parentId` to `Category`.
- Add archive fields to `Wallet` and `Category`.
- Add indexes for `walletId`, `parentId`, `occurredAt`, `type`, and common
  filtered queries.

Money amounts must be stored as integers in minor units, such as cents. Do not
store money as floating point values.

## API Requirements

Client JSON APIs should exist for core app workflows:

- list dashboard snapshot
- list transactions with filters and limit
- create transaction
- update transaction
- delete transaction
- list wallets
- create wallet
- update wallet
- archive wallet
- list categories
- create category
- update category
- archive category

Mutations should notify realtime listeners after successful writes.

## MCP Requirements

Money must expose business operations through:

- `POST /api/mcp`

MCP should cover maximum practical CRUD for all user-facing business data:

- transactions
- wallets
- categories and subcategories
- budgets when implemented
- recurring transactions when implemented
- tags when implemented

MCP list/search tools must:

- have compact default limits
- enforce maximum limits
- support clear filters
- return business objects, not UI strings
- avoid dumping unbounded datasets into the LLM context
- provide summaries or narrow projections when full records are not needed

Required transaction filters:

- date from and date to
- wallet id or wallet name
- category id or category name
- parent category id or parent category name
- transaction type
- amount range
- text query

## Local Development

Local development should be convenient:

- `npm run dev` runs on port `3005`
- Docker or platform runtime may run on port `80`
- local auth mode can bypass OS7 OAuth
- local MySQL can be configured through `DATABASE_URL`
- seed data should include wallets, hierarchical categories, and transactions
  that exercise dashboard charts

## Acceptance Criteria

The app is ready for a feature milestone when:

- core CRUD works from the UI
- matching MCP CRUD exists for the same business entities
- dashboard summaries match transaction data
- mobile and desktop layouts are verified
- `npm run typecheck` passes
- `npm run build` passes
- Prisma schema sync and seed data work from a clean database

## Open Questions

- Which currencies are required for the first production version?
- Should transfers be modeled as a separate entity or as paired transactions?
- Should users be able to share wallets with other OS7 users?
- Should categories be global per app, per user, or per workspace?
- Should Money support bank import integrations later, or only CSV import?
