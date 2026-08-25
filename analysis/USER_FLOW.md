# Simple User Flow

## Navigation

Only **Dashboard**, **Transactions**, and **Settings**, plus one global **Add files** button.

## Normal month

1. Open the Mac app.
2. Click Add files and select Stripe/Xero/ING reports together.
3. Read a plain preview: files checked, records ready, Stripe matches, items needing review.
4. Confirm once.
5. View the updated month on Dashboard.
6. If an attention card appears, review only those uncertain transactions.

## Dashboard

Top cards: Total Cash In, Total Cash Out, Business Profit, Cash Remaining. Below: income source split, expense categories, profit allocation, and financial position. Every card opens its source transactions.

## Transactions

Search/filter, click one row, correct it, save. Manual entry defaults to Affiliate Marketing Income. Imported batches use Undo Import instead of unsafe row-by-row deletion.

## Settings

Effective-month allocation percentages, lightweight monthly asset/debt snapshot, import history, backup, and restore. No developer or database terminology.

## Failure behaviour

Invalid/unreconciled files change nothing. Duplicate files change nothing. Unknown transactions remain visible but excluded from business profit. Corrections recalculate the dashboard immediately.
