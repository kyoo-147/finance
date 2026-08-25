# Requirements Analysis

## What Jerri actually needs

Jerri wants to stop maintaining spreadsheet formulas. She supplies monthly Stripe, Xero, and bank reports; the app should turn those into understandable results with minimal intervention. Simplicity and correct traceability matter more than feature breadth.

## Confirmed needs

- Employment, PT sole-trader, irregular affiliate, and other income remain separate.
- Monthly income, expenses, profit, cash flow, allocations, investments, debt, and net worth are visible.
- Transactions and classifications can be inspected and corrected.
- Allocation percentages are user-editable and must equal 100%.
- Duplicate imports are prevented.
- Common classifications can eventually be reused; uncertain activity must not be silently guessed.
- Private local use on Jerri's Mac.

## Important source findings

- The original workbook contains placeholder/demo values and empty Xero/expense import tabs. It is a visual reference, not a calculation authority.
- The supplied Stripe file is a payout/settlement report, not proof of gross customer sales.
- The bank statement contains the same Stripe deposits, plus mixed personal, business, transfer, refund, and debt activity.
- The payslip contains four distinct figures: gross, PAYG, super, and net pay.
- Affiliate input format has not been supplied, so manual entry is the honest V1 path.
- `CEO Dashboard 2026.pdf` remains unavailable in the workspace.

## Safe decisions

- Never count both Stripe payout and matching bank deposit as income.
- Use employment net pay for cash flow while retaining gross/PAYG/super detail.
- Keep unknown bank rows out of business profit until reviewed.
- Do not infer tax or accounting treatment from deposit/withdrawal direction alone.
- Make every dashboard result traceable to ledger rows.
- Keep the local and online products separate; V1 is local only.

## Product boundary

The app is a personal finance organiser, not bookkeeping certification, tax advice, BAS preparation, or a general accounting platform. Supporting only verified source layouts is safer and simpler than pretending to support all PDFs.
