# Testing and reconciliation

This directory is independent from the application. It does not modify source data and does not depend on external test libraries.

## Reconciled reference data

`fixtures/expected-reconciliation.json` is the **testing reference**, not mock UI data:

- Stripe July 2026: 23 payouts; gross = net = 502,242 cents (AUD 5,022.42); fee = 0.
- Xero payslip: period 20/07/2026–02/08/2026, paid 04/08/2026; gross 72,000 cents; PAYG 12,800 cents; net 59,200 cents; super 8,640 cents.
- ING bank statement: opening balance 57,810 cents, closing balance 121,419 cents; net movement 63,609 cents.

The bank statement contains personal, business, Stripe settlement, transfer, and debt-repayment transactions. Therefore, total withdrawals **must not** be used directly as business expenses or profit.

## Run the API acceptance harness

1. Start the local application and ensure the API binds to `127.0.0.1` only.
2. Set the URL and run:

```powershell
$env:API_BASE_URL = 'http://127.0.0.1:4747'
node tests/api-contract.mjs
```

The harness expects the `/api` namespace (replace it with `$env:API_PREFIX` if needed) and at minimum:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Returns `{ ok: true }` or `{ status: "ok" }` |
| `POST /api/imports` | Accepts multipart `source` and `file`; returns an import ID and summary |

Once the backend API is stable, update the endpoint adapter in the harness rather than changing the reference figures.

## Required E2E handover matrix

| Group | Case | Required result |
| --- | --- | --- |
| Startup | Launch shortcut | Browser opens the local URL; service listens on 127.0.0.1 only |
| Stripe | Upload the July 2026 source file | 23 records, gross/net AUD 5,022.42, zero fees, AUD, 23 unique payout IDs |
| Stripe | Upload the same file again | No new records; a clear duplicate/idempotent message |
| Stripe | Invalid amount | Entire import fails with no partial commit |
| Stripe | USD fixture | Explicit rejection or review; it must not silently enter the AUD dashboard |
| Xero | Upload source payslip | Payment date 04/08/2026; gross/PAYG/net/super match the fixture; `gross - PAYG = net` |
| Bank | Upload source statement | Period and opening/closing balances are detected; `opening + deposits - withdrawals = closing` |
| Bank | Categorization rules | `STRIPE`/internal transfer/debt repayment are excluded from business expenses by default; unknown is `needs_review` |
| Transactions | Edit category/scope | Dashboard and allocation reflect the change; an audit event is created |
| Allocation | Seven default funds | Total is exactly 10,000 bps; saving is blocked when the total differs from 100% |
| Money | Calculations | Integer cents are stored and returned; no floating-point or rounding drift |
| Restart | Stop/start the local server | SQLite preserves data, import hashes, rules, and audit log |
| Offline | No Internet connection | Imports, dashboard, and history continue to work |
| Security | Local port | The service does not bind to `0.0.0.0`; source files and PII are not sent externally |

## Financial acceptance criteria

1. Import mutations are atomic: either the entire operation succeeds or nothing is written.
2. Duplicate file hashes and duplicate business keys (provider transaction/payout IDs) are blocked.
3. Money uses integer minor units in the database/API; the UI only formats values as AUD.
4. Xero superannuation is an employer contribution and must not be added to cash net pay.
5. A Stripe payout is a cash settlement and must not be double-counted when the same settlement appears in a bank statement.
6. Business classification is reviewable and auditable; it must not be inferred with certainty from an unknown merchant.

## Authoritative browser E2E runner

```text
npm run browser:e2e
```

The runner uses Chrome/CDP and an isolated SQLite database. It covers transactions, rules, allocation, holdings, settings, backup/restore, restart persistence, degraded/error states, and screenshots. The consolidated result is maintained only in `QA-ACCEPTANCE-REPORT.md`.
