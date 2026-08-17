import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { openDatabase } from './db.mjs';
import { parsePdfImport } from './pdf-import.mjs';
import { commitImport, stageImport } from './service.mjs';

const fixture = name => readFile(resolve('..', name));
const hasSourcePdfs = existsSync(resolve('..', 'PaySlip (7).pdf')) && existsSync(resolve('..', 'Expenses Statement.pdf'));

test('parses and reconciles the supplied Xero payslip PDF', { skip: !hasSourcePdfs }, async () => {
  const result = await parsePdfImport('xero', await fixture('PaySlip (7).pdf'));
  assert.deepEqual(result.summary, {
    rowCount: 1, grossPayMinor: 72000, paygWithheldMinor: 12800,
    superannuationMinor: 8640, netMinor: 59200,
    payPeriodStart: '2026-07-20', payPeriodEnd: '2026-08-02', paymentDate: '2026-08-04',
  });
  assert.equal(result.rows[0]['Net Pay'], '592.00');
});

test('parses every supplied ING statement row and reconciles balances', { skip: !hasSourcePdfs }, async () => {
  const result = await parsePdfImport('bank', await fixture('Expenses Statement.pdf'));
  assert.equal(result.summary.rowCount, 197);
  assert.equal(result.summary.openingBalanceMinor, 57810);
  assert.equal(result.summary.closingBalanceMinor, 121419);
  assert.equal(result.summary.netCashMovementMinor, 63609);
  assert.equal(result.summary.openingBalanceMinor + result.summary.depositsMinor - result.summary.withdrawalsMinor, result.summary.closingBalanceMinor);
});

test('imports PDF data atomically and keeps Xero and bank ledger values out of profit until reviewed', { skip: !hasSourcePdfs }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jerri-pdf-test-'));
  let db;
  try {
    db = openDatabase(join(dir, 'portal.sqlite'));
    for (const [sourceAccountId, fileName] of [['xero', 'PaySlip (7).pdf'], ['bank', 'Expenses Statement.pdf']]) {
      const staged = await stageImport(db, { sourceAccountId, fileName, buffer: await fixture(fileName) });
      commitImport(db, staged.id);
    }
    const rows = db.prepare('SELECT source_account_id, include_in_profit, review_status FROM transactions ORDER BY source_account_id').all();
    assert.equal(rows.length, 198);
    assert.ok(rows.every(row => row.include_in_profit === 0));
    assert.equal(rows.filter(row => row.source_account_id === 'bank' && row.review_status === 'needs_review').length, 197);
  } finally { db?.close(); await rm(dir, { recursive: true, force: true }); }
});

test('rejects PDFs that are not readable, without creating records', async () => {
  await assert.rejects(() => parsePdfImport('xero', Buffer.from('%PDF- not a real document')), /could not be read/i);
});

test('a rejected PDF creates neither an import job nor transactions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jerri-pdf-reject-'));
  let db;
  try {
    db = openDatabase(join(dir, 'portal.sqlite'));
    await assert.rejects(() => stageImport(db, { sourceAccountId: 'xero', fileName: 'broken.pdf', buffer: Buffer.from('%PDF- not a real document') }));
    assert.equal(db.prepare('SELECT COUNT(*) count FROM import_jobs').get().count, 0);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count, 0);
  } finally { db?.close(); await rm(dir, { recursive: true, force: true }); }
});
