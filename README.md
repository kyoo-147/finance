# Jerri Finance

A private Mac-first finance dashboard built around Jerri's monthly Stripe, Xero, and ING workflow.

## Product documents

- [`analysis/PRODUCT_PLAN.md`](analysis/PRODUCT_PLAN.md)
- [`analysis/REQUIREMENTS_ANALYSIS.md`](analysis/REQUIREMENTS_ANALYSIS.md)
- [`analysis/USER_FLOW.md`](analysis/USER_FLOW.md)
- [`analysis/E2E_TEST_PLAN.md`](analysis/E2E_TEST_PLAN.md)
- [`analysis/QA_ACCEPTANCE_REPORT.md`](analysis/QA_ACCEPTANCE_REPORT.md)
- [`analysis/ADVERSARIAL_QA_MATRIX.md`](analysis/ADVERSARIAL_QA_MATRIX.md)

## Vietnamese product documents

- [`docs/JERRI_USER_GUIDE_VI.md`](docs/JERRI_USER_GUIDE_VI.md)
- [`docs/JERRI_PRODUCT_FUNCTIONS_VI.md`](docs/JERRI_PRODUCT_FUNCTIONS_VI.md)

## Development
## Development

Requires Node.js 24 for domain tests and current npm.

```bash
npm install
npm run test:all
npm run test:coverage
npm run electron:dev
```

## Synthetic monthly test data

Three fictional months (August–October 2026) are available under `test-fixtures/synthetic/`. Each month contains a mutually consistent Stripe CSV, Xero payslip PDF, and ING-style bank statement PDF.

```bash
npm run fixtures:generate
npm run test:all
```

Expected row counts, totals, matches, balances, and SHA-256 hashes are in `test-fixtures/synthetic/manifest.json`. No real customer information is used.

## Mac package

Run on macOS:

```bash
npm install
npm run test:all
npm run dist:mac
```

The unsigned DMG appears under `release/`. Apple signing/notarization requires the owner's Apple Developer identity and must be performed on macOS.

## Privacy

Financial data is stored locally in Electron's application-data directory as `jerri-finance.sqlite`. The renderer has no direct Node access. `customer-inputs/` contains private test fixtures and is intentionally ignored by Git.

## Supported inputs

- Supplied Stripe Itemised Payouts CSV layout.
- Supplied text-based Xero payslip PDF layout.
- Supplied text-based ING Orange Everyday statement PDF layout.
- Manual affiliate/other entries.

Unknown PDF layouts fail closed. See the product plan for calculation rules and exclusions.
