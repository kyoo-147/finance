# Jerri Finance V2 — Deep QA Acceptance Report

Updated: 2026-08-25 — fourth independent adversarial pass

## Verdict

**PASS for the complete product surface verifiable on Windows, including the unpacked production executable.**

This does not mean “all platforms are proven.” A signed/notarized macOS DMG and Apple Silicon/Intel execution remain explicitly UNVERIFIED.

## Current evidence

- Use-case/test-case matrix: **139 total**.
- Windows-executable: **137/137 PASS**.
- Mac-only release cases: **2 UNVERIFIED**.
- Node domain/integration/adversarial/platform test functions: **47 PASS, 0 FAIL**.
- Electron source-runtime test functions: **6 PASS, 0 FAIL**.
- The same Electron test functions against packaged `Jerri Finance.exe`: **6 PASS, 0 FAIL**.
- Source + packaged Electron executions: **12 PASS**.
- TypeScript/Vite production build: **PASS**.
- Synthetic fixture regeneration and deterministic manifest checks: **PASS**.
- Dependency audit, including development dependencies: **0 vulnerabilities**.
- Renderer exceptions in the primary and adversarial journeys: **0**.
- Axe-core WCAG scan across empty/populated Dashboard, Transactions, bulk-review selection states, Settings, transaction dialog, and import dialog: **0 violations after fixes**.
- Synthetic fixture regeneration is byte-for-byte deterministic against the pre-run SHA-256 inventory.
- Fresh package ASAR runtime files match the tested source files by SHA-256.
- Final unpacked executable SHA-256: `e6c18bc46d1e615fc403e44a29fa842136739eeb1761f05cd0cfa22173d26ad0`.
- Final `app.asar` SHA-256: `4850216d48c81125690afa66fcf194914a9dfc27228c6318cab053006bdd9956`.
- Electron fuses: RunAsNode disabled, NODE_OPTIONS disabled, ASAR integrity enabled, only-load-ASAR enabled. CLI inspect and file-protocol privileges remain enabled because Playwright/package loading requires them in the current architecture.
- Windows Authenticode status: **NOT SIGNED**.
- Node coverage: `electron/importers.mjs` and `electron/store.mjs` are **100% lines/functions**; branch coverage is **84.27%** and **80.58%**, respectively.

Detailed second-, third-, and fourth-pass cases: [`ADVERSARIAL_QA_MATRIX.md`](ADVERSARIAL_QA_MATRIX.md).

## Product journeys executed through the actual Electron UI

### Primary monthly lifecycle

1. Fresh isolated SQLite workspace.
2. Empty Dashboard.
3. Corrupt PDF selection and visible fail-closed error.
4. Native Add Files dialog with Stripe, Xero, and ING.
5. Preview counts, summaries, matching, review count, Cancel, and Confirm.
6. Duplicate preview with no writable records.
7. Dashboard totals, cents, month switching, source/category cards, and drill-down reconciliation.
8. Needs Review classification and remembered rule.
9. Manual affiliate create, search/read, update, Dashboard recalculation, and delete.
10. Allocation validation and effective-dated save.
11. Snapshot creation, exact net worth, reload, and one-field update without wiping siblings.
12. September and October import and chronological trend.
13. Payslip gross, PAYG, super, and net detail.
14. Backup through native save dialog.
15. Post-backup mutation.
16. Restore through native open dialog and exact rollback.
17. Undo one import batch.
18. Re-import the identical reverted file.
19. Close, restart, and exact persistence check.

### Adversarial UI lifecycle

1. Native import and backup dialog cancellation.
2. Positive expense rejected in the transaction editor, corrected, and retried.
3. Literal `%` search and Clear filters.
4. Allocation values that total 100 but contain `130` and `-75` rejected by the backend.
5. Effective-month profile switching reloads the proper profile.
6. Snapshot-only future month appears on Dashboard.
7. Existing snapshot values and note reload exactly.
8. Negative snapshot rejected with no mutation, followed by successful retry.
9. Invalid restore shown as a recoverable UI error.
10. Corrupt live SQLite renders a fatal/retry screen rather than a blank app.
11. External navigation, popup creation, untrusted IPC sender, and permission request are blocked.
12. Keyboard Escape closes transaction/import dialogs.

## Real and synthetic financial evidence

### Supplied private fixtures

- Stripe: 23 rows; AUD 5,022.42.
- Xero: gross 720.00; PAYG 128.00; super 86.40; net 592.00.
- ING: 197 rows; opening 578.10; closing 1,214.19; movement 636.09.
- Stripe/ING settlement matches: 23.

### Public-safe synthetic fixtures

- August–October 2026.
- Combined records: 80.
- Stripe matches: 24.
- Payroll matches: 3.
- Intentionally ambiguous bank records: 26 before remembered-rule application.
- Hashes, balances, payouts, matching, months, trends, and dashboard calculations reconcile to `test-fixtures/synthetic/manifest.json`.

## Defects fixed across all QA passes

### First pass

1. Undo then identical-file re-import violated the unique hash constraint.
2. Invalid backup probing could leave a Windows file handle problem.
3. Dashboard Update balances did nothing.
4. Confirming from Settings did not return to Dashboard.
5. Transactions retained a stale month after later import.
6. A newly created manual row could remain hidden by Needs Review filters.
7. Cash-card drill-down rows did not reconcile to card totals.
8. New drill-downs inherited stale hidden filters.
9. Transactions lacked visible month/reset controls.
10. Copy claimed a financial-year picker that did not exist.

### Second adversarial pass

1. Selecting the same file twice could fail the full confirmation.
2. Duplicate Xero plus new ING could falsely mark payroll as matched.
3. Remembered rules could override authoritative payroll matching.
4. Backend transaction validation allowed malformed dates, enums, signs, zero values, and unsafe review/profit states.
5. Allocation validation allowed out-of-range values when the sum remained 100.
6. Snapshot validation allowed invalid months and negative/fractional balances.
7. The ledger silently truncated after 1,000 rows.
8. `%` and `_` acted as SQL search wildcards.
9. Restore validation was too weak and replacement lacked rollback staging.
10. Existing snapshots were not loaded into Settings, risking accidental zeroing.
11. Snapshot-only months were absent and incorrectly showed the “first import” empty state.
12. Settings failures became unhandled renderer errors instead of recoverable messages.
13. Cash-direction Clear filters did not trigger a refresh.
14. Hidden Dashboard drill filters were not visible.
15. Dashboard amounts rounded away cents.
16. Corrupt live SQLite could prevent a usable error window.
17. Navigation trust used unsafe prefix checks; popup, permission, sender, and production DevTools boundaries were tightened.
18. Create/import actions were vulnerable to repeated clicks.
19. Accessibility scans found an unnamed month selector and multiple contrast failures.

Every listed defect has automated regression evidence.

## Defects fixed in the third independent pass

1. Strict AUD parsing now rejects sub-cent, exponent, and malformed comma input instead of rounding it.
2. Manual transaction and snapshot UI no longer rounds fractional cents before backend validation.
3. Import confirmation now uses a main-owned preview token; renderer-forged previews are rejected.
4. Undo removes dangling match links, returns orphan payroll deposits to Needs Review, and exact re-import relinks the persisted counterpart.
5. Imported source date/description/amount fields are immutable; authoritative matches cannot be reclassified.
6. Settings validation is complete before any write and saves atomically.
7. Backup restore validates every required column, financial/domain values, JSON, and reciprocal match links before replacement.
8. Existing backup replacement preserves and restores the previous backup when rename fails.
9. Failed SQLite startup closes its handle so replacing the corrupt file and pressing Retry really works on Windows.
10. Impossible Xero and ING calendar dates fail during parsing rather than at confirmation.
11. Closing the last macOS window no longer closes the store before Dock reactivation; real Mac execution remains unverified.
12. Australian calendar defaults use `Australia/Melbourne`, including UTC day/month/year boundaries.
13. Manual CRUD, settings, snapshots, import, and undo mutations now group audit writes transactionally.
14. Packaged Electron fuses were hardened and then re-tested on the exact rebuilt executable.

Detailed third-pass cases are in [`ADVERSARIAL_QA_MATRIX.md`](ADVERSARIAL_QA_MATRIX.md).

## Commands executed

```bash
npm run fixtures:generate
npm run test:all
npm run test:coverage
npm run dist:dir
JERRI_ELECTRON_EXECUTABLE="D:/work/jerri_job/jerri-finance-portal-v2/release/win-unpacked/Jerri Finance.exe" JERRI_PACKAGED=1 node --test --test-concurrency=1 tests/*.e2e.mjs
npm audit
node node_modules/@electron/fuses/dist/bin.js read --app "release/win-unpacked/Jerri Finance.exe"
sha256sum "release/win-unpacked/Jerri Finance.exe" "release/win-unpacked/resources/app.asar"
PowerShell Get-AuthenticodeSignature "release/win-unpacked/Jerri Finance.exe"
```

## Artifact/provenance boundary

The current folder has **no `.git` metadata**. Runtime files inside the final ASAR were hash-compared with this working folder, but no commit ID, clean-tree state, author history, or Git-based source custody can be proven. The Windows artifact is unpacked and unsigned; it is not a signed installer.

## Truthful remaining boundaries

1. **macOS runtime and DMG build:** UNVERIFIED on this Windows machine. Only the last-window decision logic is unit-tested.
2. **Apple signing/notarization:** UNVERIFIED; requires Jerri’s Apple Developer identity.
3. **Apple Silicon and Intel package smoke:** UNVERIFIED; requires those targets or macOS CI.
4. **Future unseen bank/payslip/Stripe layouts:** UNVERIFIED until supplied; unsupported layouts intentionally fail closed.
5. **Physical use by Jerri on her Mac:** UNVERIFIED until she runs the final app and provides workflow feedback.
6. Live APIs, public hosting, tax filing/BAS, multi-user, and mobile remain outside V1.

Evidence screenshot: `analysis/e2e-packaged-final.png`.
