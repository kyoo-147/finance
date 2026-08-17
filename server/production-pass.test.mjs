import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from './db.mjs';
import { clearImportedData, commitImport, createManualTransaction, dashboard, deleteManualTransaction, financialYearLabel, updateTransaction, resetWorkspace, revertImport, stageImport } from './service.mjs';

async function withDb(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'jerri-production-pass-')); let db;
  try { db = openDatabase(join(dir, 'portal.sqlite')); return await fn(db); }
  finally { db?.close(); await rm(dir, { recursive: true, force: true }); }
}

const stripe = (id = 'payout-1', amount = '100.00') => Buffer.from(`payout_id,effective_at,currency,gross,fee,net,description\n${id},2026-07-15 10:00:00,aud,${amount},0.00,${amount},STRIPE PAYOUT\n`);

 test('financial year changes at the configured July boundary', () => { assert.equal(financialYearLabel('2026-07', 7), 'FY 2026-27'); assert.equal(financialYearLabel('2026-06', 7), 'FY 2025-26'); });

test('monthly dashboard and allocation use only the selected month', async () => withDb(async (db) => {
  const insert = db.prepare("INSERT INTO transactions (id,source_account_id,occurred_on,description,amount_minor,currency,kind,category_id,is_business,include_in_profit,review_status,source_fingerprint,created_at,updated_at) VALUES (?, 'manual', ?, ?, ?, 'AUD', ?, ?, 1, 1, 'reviewed', ?, ?, ?)");
  insert.run('jul-in', '2026-07-15', 'July income', 10000, 'income', 'income-affiliate', 'jul-in', '2026-07-15', '2026-07-15');
  insert.run('jul-out', '2026-07-16', 'July expense', -2500, 'expense', 'software', 'jul-out', '2026-07-16', '2026-07-16');
  insert.run('aug-in', '2026-08-15', 'August income', 90000, 'income', 'income-affiliate', 'aug-in', '2026-08-15', '2026-08-15');
  assert.equal(dashboard(db, '2026-07').totals.profit_minor, 7500);
  assert.equal(dashboard(db, '2026-08').totals.profit_minor, 90000);
 }));

test('manual affiliate transaction is persisted, audited, and deletable', async () => withDb(async (db) => {
  const created = createManualTransaction(db, { occurredAt: '2026-07-20', description: 'Affiliate commission', amountMinor: 12500, type: 'income', scope: 'business', categoryId: 'income-affiliate', includedInProfit: true, notes: 'Partner payout' });
  assert.equal(created.sourceAccountId, 'manual'); assert.equal(created.isManual, true); assert.equal(created.amountMinor, 12500);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM audit_events WHERE entity_id=? AND action='created'").get(created.id).count, 1);
  const edited = updateTransaction(db, created.id, { description: 'Edited affiliate commission', amountMinor: 13000, type: 'income', scope: 'business', categoryId: 'income-affiliate', includedInProfit: true, reviewStatus: 'reviewed', notes: 'Updated' });
  assert.equal(edited.description, 'Edited affiliate commission'); assert.equal(edited.amountMinor, 13000);
  deleteManualTransaction(db, created.id);
  assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions WHERE id=?').get(created.id).count, 0);
}));

test('import preview commits only after confirmation, then can be reverted and re-imported', async () => withDb(async (db) => {
  const staged = await stageImport(db, { sourceAccountId: 'stripe', fileName: 'preview.csv', buffer: stripe() });
  assert.equal(staged.status, 'review_required'); assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count, 0);
  await commitImport(db, staged.id); assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count, 1);
  await revertImport(db, staged.id); assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count, 0);
  const restaged = await stageImport(db, { sourceAccountId: 'stripe', fileName: 'preview-again.csv', buffer: stripe() });
  assert.equal(restaged.status, 'review_required');
}));

test('Stripe and matching ING deposit reconcile one-to-one without duplicate profit', async () => withDb(async (db) => {
  const stripeJob = await stageImport(db, { sourceAccountId: 'stripe', fileName: 'stripe.csv', buffer: stripe('stripe-1', '100.00') }); await commitImport(db, stripeJob.id);
  const bank = Buffer.from('Date,Description,Amount,Currency,Transaction ID\n2026-07-16,STRIPE PAYOUT,100.00,AUD,bank-1\n');
  const bankJob = await stageImport(db, { sourceAccountId: 'bank', fileName: 'bank.csv', buffer: bank }); await commitImport(db, bankJob.id);
  const rows = db.prepare('SELECT source_account_id,kind,include_in_profit,reconciliation_status,reconciled_transaction_id FROM transactions ORDER BY source_account_id').all();
  assert.equal(rows.length, 2); assert.equal(rows[0].reconciliation_status, 'matched'); assert.equal(rows[1].reconciliation_status, 'matched');
  assert.equal(rows.find((row) => row.source_account_id === 'bank').kind, 'transfer');
  assert.equal(dashboard(db, '2026-07').totals.income_minor, 10000);
}));

test('clear imported data preserves manual data and reset restores the seeded workspace', async () => withDb(async (db) => {
  const manual = createManualTransaction(db, { occurredAt: '2026-07-20', description: 'Manual expense', amountMinor: 100, type: 'expense', scope: 'personal', categoryId: 'personal', includedInProfit: false });
  const staged = await stageImport(db, { sourceAccountId: 'stripe', fileName: 'clear.csv', buffer: stripe() }); await commitImport(db, staged.id);
  clearImportedData(db);
  assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions WHERE import_job_id IS NOT NULL').get().count, 0);
  assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions WHERE id=?').get(manual.id).count, 1);
  resetWorkspace(db);
  assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count, 0);
  assert.equal(db.prepare("SELECT COUNT(*) count FROM categories WHERE id='income-affiliate'").get().count, 1);
}));
