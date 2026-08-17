# QA acceptance report — Jerri Finance Portal

**Review date:** 2026-08-15

## Current conclusion

The core backend, FE/BE round trips, and browser acceptance runner have been corrected and pass in the current environment. **Final acceptance is not signed off yet** because endpoint contract coverage, mobile/native startup, and several supporting UI flows remain incomplete.

## Validation

```text
npm run lint         -> PASS
npm run server:test  -> 21 passed, 0 failed
npm run build        -> PASS
npm run browser:e2e  -> PASS against an isolated database
```

## Fixed in this iteration

- Asset/liability schema stores `category`; bootstrap and update preserve category after refresh/restart.
- Import jobs store and return `duplicate_rows`.
- `needs_review` transactions retain `scope: unknown` instead of being treated as personal.
- Overview Tax Reserve uses the Tax allocation rule instead of a hard-coded 25%.
- Overview/Cash Flow use liquid assets for the cash balance.
- Cash Flow filters business/in-profit transactions and generates real forecast months for 3M/6M/12M selections.
- Passive income uses `returnMtdMinor`, not portfolio value.
- FE mutations propagate errors; forms and save flows no longer report failed requests as successful.
- Category-rule update is wired from Settings UI → client → Express → SQLite.
- Category-rule re-run is atomic and creates a `rule_applied` audit event for each changed transaction.
- Regression tests cover asset/liability category round trips and unknown transaction scope.
- The browser runner checks category round trips, transactions/rules/allocation/holdings/settings, backup/restore, restart, and degraded/error screenshots.
- Older QA logs are compatibility pointers; this file is the only acceptance source.

## Open before final acceptance

### P1

1. There is no separate browser evidence for re-run semantics, although the backend is now atomic and audited.
2. The endpoint contract suite is still narrow. `tests/api-contract.mjs` checks health, Stripe import, duplicate, invalid import, and allocation shape, but does not cover every mutation route.
3. Error UX is not consistent for all fire-and-forget operations, especially source toggles and settings re-run; the global error banner exists but inline pending/error states are incomplete.

### P2 / boundaries

4. The browser runner does not fully cover Global Search, Notification Drawer, AI assistant refresh, CSV download, the current mobile matrix, or the `.cmd` launcher.
5. The AI assistant provides local deterministic explanations; it is not an AI backend or financial adviser.
6. Native Windows launcher/shortcut/manual-startup proof is outside the CDP runner.
7. Cloud sync, bank OAuth/live feeds, and online accounts are outside the local-only V1 scope.

## Evidence

- Server tests: `server/*.test.mjs`
- Browser runner: `scripts/browser-e2e.mjs`
- Screenshots: `tests/artifacts/ui-e2e/`
- FE/BE adapter: `src/api/client.ts`, `src/context/FinanceContext.tsx`

Do not call the product “100% complete” until P1 items are closed and browser/mobile/native boundaries are classified with new evidence.

Browser screenshots are generated under `tests/artifacts/ui-e2e/` locally and intentionally ignored from GitHub because they can contain financial fixture data.
