import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './db.mjs';
import { moneyToMinor, parseCsv } from './csv.mjs';
import { commitImport, stageImport } from './service.mjs';

const stripeHeader = 'payout_id,effective_at,currency,gross,fee,net,description';
const stripeRow = (overrides = {}) => {
  const value = { payout_id:'po_regression_1', effective_at:'2026-07-01 12:30:00', currency:'AUD', gross:'100.00', fee:'0.00', net:'100.00', description:'Stripe payout', ...overrides };
  return [value.payout_id,value.effective_at,value.currency,value.gross,value.fee,value.net,value.description].map(v => JSON.stringify(v)).join(',');
};
const stripeCsv = overrides => Buffer.from(`${stripeHeader}\n${stripeRow(overrides)}\n`, 'utf8');

async function withDb(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'jerri-import-regression-')); let db;
  try { db = openDatabase(join(dir, 'portal.sqlite')); return await fn(db); }
  finally { db?.close(); await rm(dir, { recursive:true, force:true }); }
}

test('money parser is exact for cents, parentheses and rejects precision loss', () => {
  assert.equal(moneyToMinor('1'), 100);
  assert.equal(moneyToMinor('$1,234.5'), 123450);
  assert.equal(moneyToMinor('($0.01)'), -1);
  assert.throws(() => moneyToMinor('1.001'), /Invalid money/);
  assert.throws(() => moneyToMinor('NaN'), /Invalid money/);
});

test('CSV parser supports BOM and quoted commas, rejects unclosed quotes', () => {
  const rows = parseCsv('\uFEFFDate,Description,Amount\r\n2026-07-01,"Coffee, team",12.30\r\n');
  assert.deepEqual(rows, [{ Date:'2026-07-01', Description:'Coffee, team', Amount:'12.30', __row:2 }]);
  assert.throws(() => parseCsv('Date,Amount\n"2026-07-01,12.00'), /not closed/);
});

test('imports Stripe alternate title-case headers and reports a correct summary', async () => {
  await withDb(async db => {
    const csv=Buffer.from('Date,Amount,Currency,ID,Description\n2026-07-01,"23.45",aud,alternate-1,"Payout, July"\n');
    const staged=await stageImport(db,{sourceAccountId:'stripe',fileName:'alternate-stripe.csv',buffer:csv});
    assert.equal(staged.summary.grossMinor,2345);
    assert.equal(staged.summary.netMinor,2345);
    assert.equal(staged.summary.feeMinor,0);
    commitImport(db,staged.id);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count,1);
  });
});

test('accepts valid Stripe fee conventions and preserves negative adjustments as expenses', async () => {
  await withDb(async db => {
    const positiveFee = await stageImport(db, { sourceAccountId:'stripe', fileName:'positive-fee.csv', buffer:stripeCsv({ gross:'100.00',fee:'5.00',net:'95.00' }) });
    commitImport(db, positiveFee.id);
    const negative = await stageImport(db, { sourceAccountId:'stripe', fileName:'negative-adjustment.csv', buffer:stripeCsv({ payout_id:'po_negative',gross:'-10.00',fee:'0.00',net:'-10.00' }) });
    commitImport(db, negative.id);
    const rows = db.prepare('SELECT amount_minor,kind,include_in_profit FROM transactions ORDER BY amount_minor').all().map(row => ({...row}));
    assert.deepEqual(rows, [{ amount_minor:-1000,kind:'expense',include_in_profit:1 }, { amount_minor:9500,kind:'income',include_in_profit:1 }]);
  });
});

test('rejects wrong currency, impossible date and non-reconciling Stripe row atomically', async () => {
  await withDb(async db => {
    for (const [name, overrides] of [
      ['currency', { currency:'USD' }],
      ['date', { effective_at:'2026-02-30 10:00:00' }],
      ['totals', { gross:'100.00',fee:'10.00',net:'95.00' }],
    ]) {
      await assert.rejects(() => stageImport(db,{ sourceAccountId:'stripe',fileName:`bad-${name}.csv`,buffer:stripeCsv(overrides) }), /Import rejected/);
    }
    assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM import_jobs WHERE status='failed'").get().count, 3);
  });
});

test('rejects invalid UTF-8 before an import job is created', async () => {
  await withDb(async db => {
    await assert.rejects(() => stageImport(db,{sourceAccountId:'stripe',fileName:'bad-encoding.csv',buffer:Buffer.from([0xff,0xfe,0x00])}), /valid UTF-8/);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM import_jobs').get().count, 0);
  });
});

test('deduplicates identical rows within a file and across a changed file hash', async () => {
  await withDb(async db => {
    const duplicateFile=Buffer.from(`${stripeHeader}\n${stripeRow()}\n${stripeRow()}\n`, 'utf8');
    const first=await stageImport(db,{sourceAccountId:'stripe',fileName:'within-file.csv',buffer:duplicateFile});
    assert.equal(first.rows.filter(row=>row.status === 'duplicate').length,1);
    commitImport(db,first.id);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count,1);
    const second=await stageImport(db,{sourceAccountId:'stripe',fileName:'same-row-new-hash.csv',buffer:Buffer.from(`${stripeHeader}\n${stripeRow()}\n\n`, 'utf8')});
    assert.equal(second.rows[0].status,'duplicate');
    commitImport(db,second.id);
    assert.equal(db.prepare('SELECT COUNT(*) count FROM transactions').get().count,1);
  });
});

test('bank transfers and Stripe settlements stay out of profit and require review', async () => {
  await withDb(async db => {
    const csv = Buffer.from('Date,Description,Amount,Currency,Transaction ID\n2026-07-01,STRIPE PAYOUT,100.00,AUD,bank-1\n2026-07-02,Transfer to savings,-75.00,AUD,bank-2\n2026-07-03,Coffee,0.00,AUD,bank-3\n');
    const staged=await stageImport(db,{sourceAccountId:'bank',fileName:'bank-mixed.csv',buffer:csv}); commitImport(db,staged.id);
    const rows=db.prepare('SELECT description,amount_minor,include_in_profit,review_status FROM transactions ORDER BY occurred_on').all();
    assert.equal(rows.length,3);
    assert.ok(rows.every(row => row.include_in_profit === 0 && row.review_status === 'needs_review'));
    assert.deepEqual(rows.map(row=>row.amount_minor),[10000,-7500,0]);
  });
});
