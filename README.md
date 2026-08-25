# Jerri Finance

Jerri Finance is a local-first Electron pet project for tracking personal and business money from Stripe, Xero, and ING files.

## Features

- Import and review Stripe CSV, Xero payslip PDF, and ING statement PDF data.
- Dashboard for cash flow, business profit, allocations, and financial snapshots.
- Transaction search, filters, review, manual CRUD, matching, and undo import.
- Deterministic Insights and deadline-aware Goals.
- Optional private Ask Jerri chat using local `llama.cpp` models.
- Local conversation history, model selection/removal, backup, and restore.
- Custom categories with safe validation and persistence.

## Run locally

Requires Node.js 24 and npm.

```bash
npm install
npm run electron:dev
```

## Test

```bash
npm run test:all
npm run test:e2e:full
```

Tests use isolated synthetic data under `test-fixtures/synthetic/`; no real customer data is required.

## Build

```bash
npm run build
npm run dist:dir
```

For a macOS package:

```bash
npm run dist:mac
```

macOS hardware, signing, and notarization require a real macOS environment and are not inferred from Windows builds.

## Privacy and safety

Finance data is stored locally in SQLite. The renderer has no direct Node.js access. AI is optional, runs locally through `llama.cpp`, receives read-only finance context, and never writes financial data. Model downloads require consent and checksum verification.

Unsupported or invalid input layouts fail closed.

## Documentation

- [`docs/JERRI_USER_GUIDE_VI.md`](docs/JERRI_USER_GUIDE_VI.md)
- [`docs/JERRI_PRODUCT_FUNCTIONS_VI.md`](docs/JERRI_PRODUCT_FUNCTIONS_VI.md)
- [`analysis/QA_ACCEPTANCE_REPORT.md`](analysis/QA_ACCEPTANCE_REPORT.md)
