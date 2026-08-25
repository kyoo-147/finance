# Synthetic Multi-Month Fixture Report

## Purpose

Exercise the complete monthly workflow without using Jerri's identity, accounts, employers, or transactions. Every name, ID, balance, and transaction in this fixture set is fictional.

## Fixture set

| Month | Stripe rows / total | Xero net | Bank rows | Bank movement | Bank closing | Matches | Needs review |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-08 | 8 / AUD 1,470.00 | AUD 1,040.00 | 18 | AUD 1,863.00 | AUD 3,113.00 | 8 Stripe + 1 payroll | 9 |
| 2026-09 | 9 / AUD 1,920.00 | AUD 1,095.00 | 18 | AUD 1,659.00 | AUD 3,546.00 | 9 Stripe + 1 payroll | 8 |
| 2026-10 | 7 / AUD 1,040.00 | AUD 990.00 | 17 | AUD 1,075.00 | AUD 3,208.00 | 7 Stripe + 1 payroll | 9 |

Combined import: 80 records, 24 Stripe settlement matches, 3 employment deposit matches, and 26 intentionally ambiguous bank records.

The records include recurring software, fuel, marketing, education, insurance, transfers, debt payments, refunds, personal spending, and irregular affiliate commissions. Ambiguous items deliberately remain in Needs Review so rule-learning and safe profit exclusion can be tested.

## Files

Each directory under `test-fixtures/synthetic/` contains:

- `Stripe_Itemised_Payouts_<month>.csv`
- `Xero_Payslip_<month>.pdf`
- `ING_Orange_Everyday_<month>.pdf`

`manifest.json` records exact expected cents, row counts, matches, balances, and SHA-256 hashes.

## Regeneration

```bash
npm run fixtures:generate
```

The generator uses fixed PDF metadata and deterministic content. Repeated generation produces the same manifest and hashes.

## Acceptance performed

```text
npm test -> 10 passed, 0 failed
production TypeScript/Vite build -> PASS
multi-month import -> 80 records
Stripe matches -> 24
employment matches -> 3
months -> 2026-08, 2026-09, 2026-10
runtime errors -> none
```

October dashboard acceptance:

- Total cash in: AUD 2,450
- Total cash out: AUD 1,375
- Business profit: AUD 1,040
- Cash remaining: AUD 1,075
- Cash-flow chart: three months
- Needs Review: 9

Screenshot: `analysis/synthetic-multi-month-dashboard.png`.
