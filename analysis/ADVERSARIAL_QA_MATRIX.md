# Jerri Finance V2 — Adversarial QA Matrix

Updated: 2026-08-25 (fourth independent pass)

## Why this pass exists

The first 60-case plan was not treated as proof that the product was exhaustive. This pass started again from the implemented UI actions, preload API, IPC handlers, store methods, parser branches, and persisted tables. It specifically targeted transitions that a single happy-path journey usually misses.

## Current test inventory

- Original use-case matrix: 60 cases.
- Original cases executable on Windows: 58.
- Second-pass adversarial cases below: 56.
- Third-pass adversarial cases below: 17.
- Fourth-pass bulk-review cases below: 5.
- Total tracked cases: **138**.
- Total Windows-executable cases: **137/137 PASS**.
- Mac-only release cases: **2 UNVERIFIED**.
- Automated Node test functions: **48 PASS**.
- Automated Electron test functions per runtime: **8 PASS**.
- Electron test functions executed against source and packaged app: **16 PASS executions**.
- Node line/function coverage for `electron/importers.mjs` and `electron/store.mjs`: **100% / 100%**.
- Node branch coverage: `importers.mjs` **84.27%**, `store.mjs` **80.58%**; both remain **100% lines/functions**.

A parameterized case can contain multiple invalid inputs. For example, A-TX-03 checks fractional, infinite, and zero values but is counted as one matrix row.

## Use-case traceability

| Use case | UI | IPC/store | Automated evidence |
|---|---|---|---|
| First-month import | Add files, Preview, Confirm, Dashboard | choose, preview, confirm, bootstrap | `electron.e2e.mjs`, domain fixtures |
| Recurring import | duplicate state, rules, month switch | preview, matching, rules, dashboard | domain, edge, adversarial, Electron E2E |
| Review/correction | attention card, individual/select-all checkboxes, bulk action, editor, remembered choice | list, atomic bulk review, update, rule upsert | domain + full Electron E2E |
| Manual affiliate CRUD | editor, search, update, delete | create, list, update, delete | edge + full Electron E2E |
| Allocation profiles | effective month and seven percentages | saveSettings, allocationFor | edge + adversarial UI |
| Financial position | exact-month snapshot editor and Dashboard | saveSnapshot, snapshotFor, dashboard | edge + adversarial UI |
| Import recovery | History, Undo, re-import | undoImport, preview, confirm | edge + full Electron E2E |
| Backup/recovery | native save/open dialogs | backup, restore, bootstrap | domain + adversarial + Electron E2E |
| Startup/security | fatal startup, blocked navigation/popups | shell bootstrap and sender trust | adversarial Electron E2E |
| Accessibility | all screens and dialogs | rendered app | axe-core WCAG scan |

## New adversarial cases — import and matching (12)

| ID | Scenario | Result |
|---|---|---|
| A-IMP-01 | Select the exact same file twice in one dialog | PASS: one ready, one duplicate |
| A-IMP-02 | Confirm the same stale preview twice | PASS: idempotent, one batch |
| A-IMP-03 | Already-imported Xero plus a new ING statement | PASS: duplicate payslip cannot falsely match payroll deposit |
| A-IMP-04 | Remembered rule conflicts with authoritative payroll match | PASS: payroll match remains transfer |
| A-IMP-05 | Stripe money cell is non-numeric | PASS: preview rejected |
| A-IMP-06 | Stripe currency is not AUD | PASS: preview rejected |
| A-IMP-07 | Stripe payout status is not paid | PASS: preview rejected |
| A-IMP-08 | Stripe date is impossible | PASS: preview rejected |
| A-IMP-09 | Stripe gross/fee/net do not reconcile | PASS: preview rejected |
| A-IMP-10 | Repeated payout identity inside one file | PASS: duplicate source identity rejected before write |
| A-IMP-11 | Active duplicates are removed before match counts are computed | PASS: preview metrics are truthful |
| A-IMP-12 | Re-imported reverted hash and active stale preview state | PASS: exactly one active import |

## New adversarial cases — transactions and Dashboard (14)

| ID | Scenario | Result |
|---|---|---|
| A-TX-01 | Impossible calendar date | PASS: rejected with no mutation |
| A-TX-02 | Empty description/category | PASS: rejected |
| A-TX-03 | Zero, fractional-cent, infinite, or unsafe amount | PASS: rejected |
| A-TX-04 | Positive expense | PASS: rejected; UI explains minus sign |
| A-TX-05 | Negative income | PASS: rejected |
| A-TX-06 | Unknown transaction type enum | PASS: rejected |
| A-TX-07 | Unknown scope enum | PASS: rejected |
| A-TX-08 | Unknown review-state enum | PASS: rejected |
| A-TX-09 | Needs Review row included in profit | PASS: rejected |
| A-TX-10 | Invalid update of an existing row | PASS: original row unchanged |
| A-TX-11 | Ledger exceeds 1,000 rows | PASS: 1,005/1,005 returned; no silent truncation |
| A-TX-12 | Search for `%` and `_` | PASS: treated literally, not SQL wildcards |
| A-TX-13 | Clear a hidden Dashboard drill-down filter | PASS: rows refresh and visible filter chips disappear |
| A-TX-14 | Dashboard total contains cents | PASS: cents render exactly instead of being rounded away |

## New adversarial cases — settings and snapshots (12)

| ID | Scenario | Result |
|---|---|---|
| A-SET-01 | Allocation contains a negative percentage but totals 100 | PASS: backend rejects |
| A-SET-02 | Allocation contains a value above 100 but totals 100 | PASS: backend rejects |
| A-SET-03 | Allocation field missing | PASS: backend rejects |
| A-SET-04 | Allocation contains NaN | PASS: backend rejects |
| A-SET-05 | Invalid/blank effective month | PASS: backend rejects |
| A-SET-06 | Change effective month backward and forward | PASS: exact applicable profile reloads |
| A-SET-07 | Invalid snapshot month | PASS: rejected |
| A-SET-08 | Negative asset/debt balance | PASS: rejected |
| A-SET-09 | Fractional-cent or infinite snapshot value | PASS: rejected |
| A-SET-10 | Reopen an existing snapshot | PASS: all exact values and note reload |
| A-SET-11 | Edit one existing balance | PASS: sibling balances are preserved |
| A-SET-12 | Snapshot month has no transactions | PASS: month appears and financial Dashboard remains visible |

## New adversarial cases — backup, restore, lifecycle (10)

| ID | Scenario | Result |
|---|---|---|
| A-REC-01 | Save backup over the live database path | PASS: refused |
| A-REC-02 | Restore from the live database path | PASS: refused |
| A-REC-03 | SQLite file has a transactions table but is not a Jerri backup | PASS: refused by schema contract |
| A-REC-04 | Invalid restore attempt | PASS: live store remains open and writable |
| A-REC-05 | Successful backup contains imports, transactions, rules, profiles, snapshots, and audit | PASS: exact counts restored |
| A-REC-06 | Backup save dialog is cancelled | PASS: no false success toast |
| A-REC-07 | Invalid restore through visible Settings UI | PASS: visible error and no state loss |
| A-REC-08 | Corrupt live SQLite on startup | PASS: visible fatal/retry screen, not blank app |
| A-REC-09 | Error then valid retry | PASS: controls recover and save succeeds |
| A-REC-10 | Restart after import/undo/re-import | PASS: exact months and totals persist |

## New adversarial cases — shell, security, accessibility (8)

| ID | Scenario | Result |
|---|---|---|
| A-QUA-01 | External top-level navigation | PASS: blocked |
| A-QUA-02 | External popup creation | PASS: blocked |
| A-QUA-03 | IPC call from an untrusted renderer URL | PASS: sender URL is rejected by handler contract |
| A-QUA-04 | Runtime permission request | PASS: default session denies requests |
| A-QUA-05 | Empty Dashboard, Transactions, Settings WCAG scan | PASS: zero axe violations |
| A-QUA-06 | Transaction dialog and keyboard Escape | PASS: labelled dialog, recoverable close |
| A-QUA-07 | Import dialog and populated Dashboard WCAG scan | PASS: zero axe violations |
| A-QUA-08 | Source and packaged executable execute the same five Electron suites | PASS on Windows |

## Defects found only because of the second pass

1. Duplicate files selected together could roll back the whole import.
2. A duplicate payslip could falsely turn a new bank deposit into a payroll transfer.
3. Remembered rules could override authoritative matching.
4. Manual and settings IPC accepted malformed enums, impossible dates, sign errors, zero amounts, negative balances, and out-of-range allocations.
5. Transaction results silently stopped at 1,000 rows.
6. `%` and `_` behaved as hidden SQL search wildcards.
7. Restore accepted structurally unrelated SQLite files and replacement was not rollback-safe.
8. Snapshot forms did not reload existing values, risking accidental zeroing.
9. Snapshot-only months were absent from month navigation and rendered an empty Dashboard.
10. Settings errors escaped as unhandled renderer errors instead of visible recoverable messages.
11. Clear filters did not refresh cash-direction-only drill-downs because dependencies were incomplete.
12. Hidden drill-down filters were not visible to the user.
13. Dashboard values silently rounded away cents.
14. Invalid live SQLite could prevent any window from being created.
15. External navigation checks were prefix-based and production DevTools/permissions were not locked down.
16. Double-clicking create/import actions could submit twice.
17. Automated accessibility scans found unnamed month selection and multiple contrast failures.

## Third-pass cases — recovery, provenance, lifecycle, and source integrity (17)

| ID | Scenario | Result |
|---|---|---|
| A3-IMP-01 | Stripe sub-cent, exponent, or malformed comma money | PASS: rejected before preview |
| A3-IMP-02 | Impossible Xero payment/pay-period date | PASS: rejected during PDF parsing |
| A3-IMP-03 | Impossible ING transaction date | PASS: rejected during PDF parsing |
| A3-IPC-01 | Forged renderer import preview/token | PASS: rejected; main retains authoritative preview |
| A3-LIFE-01 | Undo Xero from a matched Xero/ING set | PASS: bank counterpart is unlinked and returned to Needs Review |
| A3-LIFE-02 | Re-import the exact undone Xero file | PASS: exact persisted bank counterpart is relinked |
| A3-LIFE-03 | Re-import the exact undone Stripe file through UI | PASS: exact persisted bank counterparts are relinked |
| A3-TX-01 | Change imported date, description, or amount | PASS: backend rejects; UI locks source facts |
| A3-TX-02 | Reclassify authoritative Stripe/payroll match | PASS: backend rejects |
| A3-SET-01 | Invalid allocation combined with scalar settings | PASS: all settings roll back atomically |
| A3-REC-01 | Lookalike backup with missing required column | PASS: rejected before live replacement |
| A3-REC-02 | Backup with invalid transaction metadata JSON | PASS: rejected before live replacement |
| A3-REC-03 | Backup with dangling/non-reciprocal match metadata | PASS: rejected before live replacement |
| A3-REC-04 | Injected failure while replacing an existing backup | PASS: previous known-good backup restored |
| A3-START-01 | Corrupt SQLite startup followed by repaired-file retry | PASS: failed handle closes and visible Retry reopens workspace |
| A3-TIME-01 | UTC instant crosses Melbourne day/month/year boundary | PASS: Australia/Melbourne calendar date is selected |
| A3-MAC-01 | Last-window lifecycle decision on macOS | PASS at unit/logic level: app remains alive and store closes only before quit; real Mac execution remains UNVERIFIED |

## Third-pass defects found and fixed

1. Stripe money grammar silently accepted sub-cent, exponent, and malformed comma values.
2. Renderer money fields rounded sub-cent manual transactions and snapshots before backend validation.
3. Renderer could submit a forged or modified import preview to main.
4. Undo left cross-file match metadata/classifications dangling, and exact Xero/Stripe re-import did not restore links.
5. Imported source dates, descriptions, and amounts were editable; matched transfers could be reclassified.
6. Invalid allocation could partially persist scalar settings.
7. Structurally incomplete or semantically corrupt backups could pass probing and replace the live database.
8. Existing backup replacement had a deletion window before rename success.
9. Failed SQLite startup leaked a Windows file handle, making a real repair/retry impossible.
10. Xero and ING impossible calendar dates could survive preview parsing.
11. macOS last-window handling closed SQLite before Dock reactivation.
12. UTC defaults could select the prior Australian date/month.
13. Packaged Electron security fuses were left at permissive defaults.

All material third-pass defects above have regression evidence. Mutation plus audit writes are now transactionally grouped for manual CRUD, settings, snapshots, import confirmation, and undo.

## Platform boundaries

- Windows source app: **VERIFIED by the current 47 Node + 7 Electron suites**.
- Freshly rebuilt Windows unpacked packaged app: **VERIFIED by the same 7 Electron suites**.
- Packaged source identity: **VERIFIED for runtime main/preload/store/importer/calendar/lifecycle files inside ASAR**.
- Windows Authenticode signature: **NOT SIGNED**; this is an unpacked acceptance artifact, not a signed installer.
- macOS lifecycle branch: **unit-verified only**, not physical/runtime Mac proof.
- macOS unsigned DMG build: **UNVERIFIED in this environment**.
- macOS signing/notarization: **UNVERIFIED; requires Apple identity**.
- Apple Silicon and Intel smoke: **UNVERIFIED; requires those targets**.
- Physical Jerri workflow and future unseen report layouts: **UNVERIFIED until supplied and run**.

## Fourth-pass cases — bulk transaction review (5)

| ID | Scenario | Result |
|---|---|---|
| B-REV-01 | Tick one Needs Review transaction and approve it without affecting unselected rows | PASS: only the selected transaction is confirmed |
| B-REV-02 | Select all currently visible Needs Review transactions and approve once | PASS: every eligible visible row is confirmed |
| B-REV-03 | Bulk selection contains a stale, missing, duplicate, or already-confirmed ID | PASS: request is rejected and all prior updates roll back |
| B-REV-04 | Bulk action updates Dashboard/review list and records one auditable operation | PASS: count, UI state, dashboard, and audit payload agree |
| B-REV-05 | Empty, populated, and selected bulk-review states meet automated WCAG rules | PASS: axe-core reports zero violations |

## Fifth-pass case — all-time dashboard view (1)

| ID | Scenario | Result |
|---|---|---|
| D-ALL-01 | Switch Dashboard from a month to All time and drill into totals | PASS: all months aggregate correctly, trend remains chronological, and drill-down does not apply a month filter |
