import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './db.mjs';
import { allocateProfit, dashboard, toTransaction } from './service.mjs';

test('employment income stays personal in the DTO and cannot become business profit by direction alone', () => {
  const transaction = toTransaction({
    id: 'xero-pay', occurred_on: '2026-08-04', description: 'Xero employment pay',
    source_account_id: 'xero', amount_minor: 59200, currency: 'AUD', kind: 'income',
    category_id: 'income-xero', is_business: 0, include_in_profit: 0,
    review_status: 'reviewed', created_at: '2026-08-04T00:00:00Z', updated_at: '2026-08-04T00:00:00Z',
  });
  assert.equal(transaction.scope, 'personal');
  assert.equal(transaction.includedInProfit, false);
});

test('allocation uses deterministic largest-remainder cents and reconciles to profit', () => {
  const rules = [
    { id: 'owner', name: 'Owner', percentage_bps: 3000, sort_order: 1 },
    { id: 'tax', name: 'Tax', percentage_bps: 2500, sort_order: 2 },
    { id: 'savings', name: 'Savings', percentage_bps: 1000, sort_order: 3 },
    { id: 'invest', name: 'Invest', percentage_bps: 1000, sort_order: 4 },
    { id: 'education', name: 'Education', percentage_bps: 500, sort_order: 5 },
    { id: 'travel', name: 'Travel', percentage_bps: 500, sort_order: 6 },
    { id: 'debt', name: 'Debt', percentage_bps: 1500, sort_order: 7 },
  ];
  const result = allocateProfit(101, rules);
  assert.equal(result.reduce((sum, row) => sum + row.amount_minor, 0), 101);
  // Owner's Pay has the largest fractional remainder (0.30 of a cent), so it
  // receives the one residual cent under the stable tie-break rule.
  assert.deepEqual(result.map(row => row.amount_minor), [31, 25, 10, 10, 5, 5, 15]);
  assert.ok(allocateProfit(-100, rules).every(row => row.amount_minor === 0));
});

test('dashboard excludes personal income and excluded business transactions from P&L', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jerri-financial-integrity-'));
  let db;
  try {
    db = openDatabase(join(dir, 'portal.sqlite'));
    const insert = db.prepare("INSERT INTO transactions (id,source_account_id,occurred_on,description,amount_minor,currency,kind,category_id,is_business,include_in_profit,review_status,source_fingerprint,created_at,updated_at) VALUES (?, ?, ?, ?, ?, 'AUD', ?, ?, ?, ?, 'reviewed', ?, ?, ?)");
    const now = '2026-08-14T00:00:00Z';
    insert.run('stripe', 'stripe', '2026-07-31', 'Stripe payout', 10001, 'income', 'income-stripe', 1, 1, 'financial-integrity-stripe', now, now);
    insert.run('xero', 'xero', '2026-08-04', 'Xero pay', 59200, 'income', 'income-xero', 0, 0, 'financial-integrity-xero', now, now);
    insert.run('bank', 'bank', '2026-08-05', 'Bank deposit', 99999, 'income', 'uncategorized', 1, 0, 'financial-integrity-bank', now, now);
    insert.run('expense', 'bank', '2026-08-06', 'Excluded expense', -5000, 'expense', 'software', 1, 0, 'financial-integrity-expense', now, now);
    const result = dashboard(db);
    assert.equal(result.totals.income_minor, 10001);
    assert.equal(result.totals.expense_minor, 0);
    assert.equal(result.totals.profit_minor, 10001);
    assert.equal(result.allocations.reduce((sum, row) => sum + row.amount_minor, 0), 10001);
  } finally {
    db?.close();
    await rm(dir, { recursive: true, force: true });
  }
});
