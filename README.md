# Jerri Finance Portal

A local-only personal finance management application. The web server listens only on `http://127.0.0.1:4747`; there are no cloud accounts, API keys, or uploads to the Internet.

## Install and launch

Requires Node.js 24 or newer.

1. Open a terminal in the project directory and run `npm install`.
2. Run `npm run build`.
3. Double-click **Start Jerri Finance Portal.cmd**.

The launcher checks dependencies, the production build, and the local health endpoint before opening the browser. If the portal is already running, it opens a new tab only. Keep the server window open while using the portal; close it to stop the portal.

## Import sources

- Stripe: Itemised Payouts CSV.
- Xero: CSV or text-based payslip PDF using the expected layout.
- ING: CSV or text-based Orange Everyday statement PDF using the expected layout.

PDF files are accepted only when required fields can be read and the values reconcile exactly. Scanned, password-protected, corrupted, unexpected-layout, or unreconciled PDFs are safely rejected before any transaction is written. Bank transactions are always review-first; Stripe settlements and transfers are not automatically included in business profit.

## Backup and restore

In **Settings → Local Data**, choose **Download backup**. The `.json` file contains the SQLite database and a SHA-256 manifest. Store it on a separate drive or backup device.

To restore, choose **Choose backup**. The portal validates the format, checksum, size, SQLite integrity, and required tables before replacing current data. Restore replaces all local data; create a fresh backup before restoring.

The active database is stored at `data/jerri-finance.sqlite`. All monetary values are stored as integer cents; floating-point values are not used for money in the database or API. Protect the computer with a Windows account and BitLocker where possible; SQLite is not encrypted at the database layer in V1.

## Testing

- `npm run lint` — frontend type-check.
- `npm run build` — production build.
- `npm run server:test` — regression tests for PDF/CSV imports, financial integrity, SQLite atomicity, backup/restore, and persistence.
- `npm run browser:e2e` — full Chrome/CDP acceptance run against an isolated database. Chrome must run with remote debugging on `:9222`; the runner starts the local server and writes screenshots to `tests/artifacts/ui-e2e/`.

## Protected public deployment

For a VPS deployment, keep Node bound to `127.0.0.1` and place Nginx in front of it. Set `JERRI_PUBLIC_MODE=true`, `JERRI_AUTH_USER`, and `JERRI_AUTH_PASSWORD` in the service environment. The health endpoint then reports `public-protected` and all portal/API routes require Basic Auth.

Basic Auth must be used behind trusted HTTPS. Do not expose financial data or backup/restore endpoints over plain HTTP. A real domain and trusted TLS certificate are required for a client-facing deployment.
