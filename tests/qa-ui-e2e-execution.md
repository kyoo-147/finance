# Browser E2E execution record

**Authoritative command:**

```text
npm run browser:e2e
```

The runner starts an isolated local SQLite server and drives Chrome through CDP. It verifies:

- overview and navigation
- asset create/update and liability create
- Stripe, Xero and ING imports
- transaction bulk categorization, edit/review path and rule creation
- invalid allocation total and valid allocation persistence
- investment holding create and restart persistence
- profile and notification settings persistence
- backup export, browser mutation, restore and post-restore verification
- daemon restart persistence
- degraded API rendering through CDP request failure
- invalid import error rendering
- screenshot artifacts for success, invalid, destructive and degraded states

Generated artifacts are under `tests/artifacts/ui-e2e/`. The consolidated status and exact remaining boundaries are maintained only in `QA-ACCEPTANCE-REPORT.md`.
