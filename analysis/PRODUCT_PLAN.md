# Jerri Finance Portal V2 — Product and Implementation Plan

## Goal

A private Mac app for a non-technical user. The normal monthly routine is:

`Open Jerri Finance -> Add files -> Check exceptions -> Confirm -> Dashboard`

The product calculates everything it can safely calculate. It asks Jerri only when a bank transaction is genuinely ambiguous.

## Fixed V1 scope

### Three permanent areas

1. **Dashboard** — month selector, cash in/out, business profit, cash remaining, income sources, expenses, profit allocation, and financial position.
2. **Transactions** — search, filters, direct editing, manual affiliate entries, and traceability.
3. **Settings** — allocation percentages, balance snapshots, import history, backup, and restore.

A global **Add files** action is available everywhere.

### Inputs

- Stripe Itemised Payouts CSV matching the supplied schema.
- Text-based Xero payslip PDF matching the supplied layout.
- Text-based ING Orange Everyday statement PDF matching the supplied layout.
- Manual affiliate and other income/expenses.

Unsupported, scanned, corrupt, or unreconciled files fail before any database change.

### Calculation rules

- AUD integer cents; no floating-point money in storage.
- Australian financial year defaults to July–June.
- Stripe payout rows are PT income for the supplied workflow.
- Matching ING Stripe deposits are transfers, not duplicate revenue.
- Employment cash flow uses net pay. Gross, PAYG, super, and pay period remain metadata.
- Unknown and personal bank activity cannot enter business profit.
- Allocatable profit is included PT/affiliate business income less included business operating expenses.
- Allocation defaults: Owner's Pay 30%, Tax 25%, Savings 10%, Investments 10%, Education 5%, Travel 5%, Credit Card Debt 15%.
- Allocation must total exactly 100% and is effective-dated.

## User flow

### First use

Defaults are already sensible: AUD, July–June FY, four income sources, and approved allocation percentages. Jerri can begin by adding files; no long setup wizard is required.

### Monthly import

1. Click **Add files**.
2. Select one or multiple CSV/PDF reports.
3. App auto-detects source, validates totals, identifies period, checks duplicates, and matches Stripe settlements.
4. Preview reports file counts, records, matches, duplicate status, and review count.
5. Confirm once.
6. Dashboard opens on the latest data month.

Unclear bank records are imported as `Needs Review`, excluded from business profit, and surfaced as one attention action.

### Inspect and correct

Every dashboard card links to the underlying ledger. A transaction can be corrected in one compact form: date, description, amount, type, scope, category, profit inclusion, and note. Dashboard values recalculate immediately.

Imported records are removed batch-by-batch through **Undo Import**. Manual records can be edited or removed individually.

### Long-term position

Jerri enters a lightweight monthly snapshot for savings, investments, super, assets, credit-card debt, loans, and other liabilities. The dashboard computes estimated net worth without requiring another detailed ledger.

## Architecture

- Electron desktop shell for a normal Mac `.app` experience.
- React + TypeScript frontend.
- Local SQLite through Node's built-in `node:sqlite`.
- Electron IPC with context isolation; renderer has no direct Node access.
- PDF.js coordinate-aware extraction for the supplied text-based PDFs.
- Local bundled fonts; routine use has no Internet dependency.

The database lives in the Mac application data directory. Backup/restore uses a user-selected SQLite copy and validates integrity before replacement.

## Delivery phases

1. Requirements and safe accounting boundaries.
2. Fresh desktop foundation and local database.
3. Real Stripe, Xero, and ING parsers with reconciliation tests.
4. Import preview, duplicate detection, settlement matching, confirm, and undo.
5. Dashboard, transaction drill-down/editing, allocations, and financial snapshots.
6. Backup/restore, accessibility and visual QA, Mac package and handover.

## Verification contract

- Stripe: 23 rows, AUD 5,022.42.
- Xero: gross 720.00, PAYG 128.00, super 86.40, net 592.00.
- ING: 197 rows, opening 578.10, closing 1,214.19, movement 636.09.
- Stripe/ING: 23 settlement matches and no duplicate business income.
- Re-import changes nothing.
- Personal/unknown/transfers cannot enter business profit.
- Undo Import removes only its batch.
- Restart, backup, restore, TypeScript build, domain tests, and desktop UI smoke pass.

## Explicit exclusions

No APIs/live sync, AI advice, tax filing/BAS, mobile app, multi-user tenancy, public hosting, complex budgeting, arbitrary PDF support, or custom report builder.

## Platform boundary

The source is Mac-first, but a signed/notarized `.dmg` must be produced and smoke-tested on macOS. Windows can verify domain logic, production frontend, and an unsigned desktop package, but cannot truthfully sign/notarize an Apple release.
