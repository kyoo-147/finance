# Jerri Finance V2 — Exhaustive Use Cases and E2E Test Plan

## Acceptance standard

## Execution result

As of the fourth independent adversarial pass on 2026-08-25, the original 58 Windows-executable cases plus 56 second-pass, 17 third-pass, and 5 fourth-pass plus 1 fifth-pass case pass: **137/137 Windows-executable cases**. The tracked matrix now contains **139 cases** total. QUA-06 and QUA-07 remain UNVERIFIED because they require macOS signing/notarization and Apple Silicon/Intel targets. The macOS last-window decision is unit-tested but is not counted as real Mac execution. Evidence is recorded in [`QA_ACCEPTANCE_REPORT.md`](QA_ACCEPTANCE_REPORT.md) and [`ADVERSARIAL_QA_MATRIX.md`](ADVERSARIAL_QA_MATRIX.md).

A test is PASS only when the visible UI, persisted SQLite state, and expected financial result agree. A green parser test alone is not end-to-end proof. Unsupported platform claims remain explicitly unverified.

## Primary personas and use cases

### UC-01 First month

Jerri opens an empty app, selects Stripe/Xero/ING files, checks the preview, confirms once, sees the correct month, and is shown only genuinely uncertain bank activity.

### UC-02 Recurring month

Jerri imports later reports. Duplicate deposits are matched, previously remembered merchant choices are applied, monthly totals and cash-flow history update, and older months remain selectable.

### UC-03 Correct a classification

Jerri opens Needs Review, classifies a transaction, includes/excludes it from business profit, optionally remembers the choice, and immediately sees corrected totals.

### UC-04 Affiliate/manual entry lifecycle

Jerri creates a manual affiliate commission, finds it, edits it, sees the updated dashboard, and deletes it without affecting imported records.

### UC-05 Profit setup

Jerri changes effective-dated allocation percentages. Invalid totals cannot be saved; valid 100% totals update the selected/future month without silently rewriting earlier profiles.

### UC-06 Financial position

Jerri enters savings, investments, super, assets, and debts as AUD values. Net worth is calculated and the dashboard card updates.

### UC-07 Recover from import mistake

Jerri uses Undo Import for one batch. Only that batch disappears. She can import the same file again without a uniqueness failure.

### UC-08 Backup and recovery

Jerri saves a local backup, makes later changes, restores the backup, and returns to the exact prior state. Invalid backups are rejected without damaging current data.

### UC-09 Failure safety

Unsupported, corrupt, malformed, unreconciled, overlapping, or duplicate input never produces a partial ledger write or misleading success state.

## Test matrix

### Application shell and navigation

| ID | Test | Expected |
|---|---|---|
| APP-01 | Launch production Electron app with fresh data directory | Empty Dashboard renders; no runtime exception |
| APP-02 | Renderer security contract | Context isolation and sandbox enabled; no direct Node globals; CSP present |
| APP-03 | Navigate Dashboard → Transactions → Settings → Dashboard | Correct heading and controls on every screen |
| APP-04 | Dashboard Update balances | Navigates to Settings financial-position section |
| APP-05 | Restart app | Previously committed data remains |
| APP-06 | Offline assets | Fonts/icons/UI load from local package only |

### Import and parsing

| ID | Test | Expected |
|---|---|---|
| IMP-01 | Real Stripe CSV | 23 rows; AUD 5,022.42 |
| IMP-02 | Real Xero PDF | Gross 720, PAYG 128, super 86.40, net 592 |
| IMP-03 | Real ING PDF | 197 rows; opening 578.10; closing 1,214.19; movement 636.09 |
| IMP-04 | Synthetic August three-file preview | 27 records; 8 Stripe + 1 payroll matches; 9 review |
| IMP-05 | Native Add Files button and preview modal | Correct file names, counts, summaries, and Confirm/Cancel |
| IMP-06 | Confirm import | Atomic write and Dashboard redirect/update |
| IMP-07 | Duplicate active files | Zero new records and disabled Confirm |
| IMP-08 | Undo then re-import identical file | Re-import succeeds and restores exactly one batch |
| IMP-09 | All three synthetic months | 80 records; 24 Stripe + 3 payroll matches; 3 months |
| IMP-10 | Unsupported extension | Plain error; zero write |
| IMP-11 | Malformed Stripe schema | Plain error; zero write |
| IMP-12 | Corrupt PDF | Plain error; zero write |
| IMP-13 | Unreconciled bank statement | Rejected before confirm |
| IMP-14 | Duplicate transaction identity in a different batch | Whole confirmation rolls back |
| IMP-15 | Mixed valid + invalid preview | No partial confirmation |
| IMP-16 | Source hashes and deterministic fixtures | Manifest hashes match on every run |

### Matching and financial integrity

| ID | Test | Expected |
|---|---|---|
| FIN-01 | Stripe CSV + matching bank deposits | Bank deposits become transfers; payout counted once |
| FIN-02 | Xero payslip + matching payroll deposit | Bank deposit becomes transfer; net pay counted once |
| FIN-03 | Unknown/personal/transfer profit guard | Cannot enter business profit |
| FIN-04 | Business income/expense profit inclusion | Signed cents affect profit exactly once |
| FIN-05 | Cash in minus cash out | Equals cash remaining/net movement for reconciled month |
| FIN-06 | Allocation rounding | Seven amounts sum exactly to positive profit pool |
| FIN-07 | Zero/negative profit | No misleading positive allocation |
| FIN-08 | Effective-dated allocation | Correct profile selected by month |
| FIN-09 | Cash-flow trend | Chronological months and exact cash-in/out values |
| FIN-10 | Dashboard traceability | Cards lead to matching ledger filters |

### Transaction CRUD and review

| ID | Test | Expected |
|---|---|---|
| TX-01 | Needs Review attention card | Opens only review-required rows |
| TX-02 | Edit imported transaction classification | Saves and recalculates immediately |
| TX-03 | Remember exact-description rule | Same future description is auto-confirmed |
| TX-04 | Create manual affiliate income | Appears in ledger and profit |
| TX-05 | Read/search manual transaction | Search finds exact row |
| TX-06 | Update manual amount/category/note | Persisted row and dashboard update |
| TX-07 | Delete manual transaction | Row and financial effect disappear |
| TX-08 | Attempt individual delete of imported row | Rejected; Undo Import required |
| TX-09 | Filters by month/type/scope/category/review | Every returned row satisfies filter |
| TX-10 | Empty search result | Clear empty state; no stale rows |
| TX-11 | Invalid transaction fields | Rejected without mutation |
| TX-12 | Invalid profit inclusion | Rejected without mutation |

### Settings, snapshots, backup, restore

| ID | Test | Expected |
|---|---|---|
| SET-01 | Allocation total below/above 100% | Save disabled and backend rejects |
| SET-02 | Valid allocation equals 100% | Saved with effective month |
| SET-03 | Enter financial snapshot in AUD | Stored as cents; net worth exact |
| SET-04 | Update same-month snapshot | One updated snapshot, no duplicate |
| SET-05 | Backup through UI/native save dialog | Valid SQLite copy produced |
| SET-06 | Restore through UI/native open dialog | Later changes removed; backed-up state restored |
| SET-07 | Restore invalid/non-SQLite file | Rejected; live workspace unchanged |
| SET-08 | Import history | Correct source, period, count, status and undo state |
| SET-09 | Undo one batch | Other batches/manual rows remain |

### Production quality and boundary checks

| ID | Test | Expected |
|---|---|---|
| QUA-01 | TypeScript/Vite production build | PASS |
| QUA-02 | Node domain/integration suite | All tests PASS |
| QUA-03 | Production packaged Electron runtime | Launch/import/CRUD/settings smoke PASS |
| QUA-04 | Dependency audit | 0 known vulnerabilities |
| QUA-05 | Customer files excluded from Git | Private fixtures ignored |
| QUA-06 | Mac DMG/sign/notarize | Must be run on macOS; not claimable from Windows |
| QUA-07 | Apple Silicon and Intel package smoke | Requires the corresponding Mac hardware/CI |

## Third-pass acceptance extensions

The third pass adds explicit acceptance for strict AUD grammar, impossible PDF dates, main-owned import previews, imported-source immutability, authoritative-match protection, cross-file undo/re-import relinking, atomic settings, semantic/relational backup validation, safe backup replacement failure, real corrupt-file repair/retry, Melbourne calendar boundaries, macOS last-window lifecycle logic, ASAR source identity, and hardened Electron fuses. Exact IDs and outcomes are in `ADVERSARIAL_QA_MATRIX.md`.

These extensions do not change the Mac hardware/signing boundary and do not claim support for unseen document layouts.

## Test data

- Private real fixtures are used locally only and are ignored by Git.
- Public-safe synthetic fixtures cover August–October 2026.
- Temporary databases, backups, corrupt files, and altered batches are created under isolated test directories and deleted after each run.

## Required final evidence

1. Machine-readable test output.
2. Browser/Electron E2E output and screenshots.
3. Exact defects found and fixes applied.
4. Remaining unverified Mac-only boundaries.
5. No claim of “all tested” unless every applicable matrix row is actually covered.
