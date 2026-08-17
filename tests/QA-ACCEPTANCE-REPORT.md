# QA acceptance report — Jerri Finance Portal

**Final engineering pass:** 2026-08-17

## Implemented

- Monthly reporting defaults to the latest transaction month and supports explicit month selection for Overview, Cash Flow, and Profit Allocation. Net Worth and Investments remain current-position views.
- Financial year labels are calculated from `financialYearStartMonth`; July 2026 displays as FY 2026-27.
- Review-required bank transactions remain `unknown`. Completing review requires an explicit scope, category, and profit-inclusion decision. There is no one-click Approve action.
- Personal and unknown transactions cannot enter business profit, including through category rules, bulk updates, or rule re-runs.
- Rule ordering is deterministic and rule re-run refreshes the canonical snapshot instead of replacing the ledger with only changed rows.
- Stripe payouts are authoritative. Matching ING Stripe deposits are matched one-to-one and converted to transfers excluded from profit.
- Added `Affiliate Marketing Income` and manual transaction create/edit/delete with integer cents, explicit classification, notes, audit events, and delete confirmation.
- PDF imports stage first and require Preview → Confirm Import before committing.
- Xero payslip and ING Orange Everyday parsing preserve/validate their required fields and reconcile before any transaction is committed.
- Import history includes period, counts, totals, status, and revert time. Undo Import is atomic, batch-scoped, audited, and allows a reverted file to be imported again.
- Added Clear Imported Data and Reset Finance Workspace recovery actions while preserving manual data for clear-imported.
- Stable bank identity no longer depends on the source PDF hash, protecting overlapping/re-exported statements from duplicate rows.
- Windows launcher now requires Node.js 24+, checks health, builds only when needed, and reports clear errors.
- Optional Basic Auth and public deployment mode are available through `JERRI_AUTH_USER`, `JERRI_AUTH_PASSWORD`, and `JERRI_PUBLIC_MODE`; the Node service can remain bound to localhost behind Nginx.

## Validation

```text
npm run lint         -> PASS
npm run server:test  -> 26 passed, 0 failed
npm run build        -> PASS
npm run browser:e2e  -> PASS
node tests/api-contract.mjs -> 5 passed
node tests/reconciliation-fixture-check.mjs -> PASS
```

## Real fixture evidence

Real local customer fixtures were used for validation and were not committed to the public repository:

- Stripe July 2026: 23 rows, gross AUD 5,022.42, fees AUD 0.00, net AUD 5,022.42.
- Xero: 2026-07-20 to 2026-08-02, payment 2026-08-04, gross AUD 720.00, PAYG AUD 128.00, super AUD 86.40, net AUD 592.00.
- ING July 2026: 197 rows, opening AUD 578.10, closing AUD 1,214.19, net movement AUD 636.09.
- Stripe/ING reconciliation: 23 matching pairs, 46 matched rows, 23 bank rows converted to transfers, July business income AUD 5,022.42 with zero duplicate bank revenue.
- Corrupt/unreadable PDFs: rejected before commit with zero transactions.

## Remaining limitations

- The public VPS requires a real domain and trusted TLS certificate for browser-trusted HTTPS. An IP-only deployment cannot obtain a normal trusted certificate; do not use plain HTTP for real customer financial data.
- The current deployment is single-workspace. Multi-tenant customer isolation and user/session management are not implemented.
- Live bank sync, OAuth, cloud sync, and automatic scheduled imports remain out of scope.
- Browser E2E still does not automate every Global Search, Notification Drawer, mobile viewport, or Windows shortcut interaction.

This report does not claim production-ready public customer hosting until trusted HTTPS, authentication deployment configuration, and tenant isolation are complete.
