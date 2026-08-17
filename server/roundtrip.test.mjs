import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from './db.mjs';
import { bootstrap, toTransaction } from './service.mjs';

test('asset and liability categories survive the canonical bootstrap DTO', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jerri-roundtrip-'));
  let db;
  try {
    db = openDatabase(join(dir, 'portal.sqlite'));
    const now = new Date().toISOString();
    db.prepare('INSERT INTO assets (id,name,amount_minor,as_of_date,category,created_at) VALUES (?, ?, ?, ?, ?, ?)').run('asset_vehicle', 'Vehicle', 100, '2026-08-15', 'vehicle', now);
    db.prepare('INSERT INTO liabilities (id,name,amount_minor,as_of_date,category,created_at) VALUES (?, ?, ?, ?, ?, ?)').run('liability_mortgage', 'Mortgage', 200, '2026-08-15', 'mortgage', now);
    const snapshot = bootstrap(db);
    assert.equal(snapshot.assets.find((row) => row.id === 'asset_vehicle')?.category, 'vehicle');
    assert.equal(snapshot.liabilities.find((row) => row.id === 'liability_mortgage')?.category, 'mortgage');
  } finally {
    db?.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('needs-review transactions retain unknown scope in the DTO', () => {
  const transaction = toTransaction({
    id: 'bank-unknown', occurred_on: '2026-08-15', description: 'Unknown bank line',
    source_account_id: 'bank', amount_minor: -100, currency: 'AUD', kind: 'expense',
    category_id: 'uncategorized', is_business: 0, include_in_profit: 0,
    review_status: 'needs_review', created_at: '2026-08-15T00:00:00Z', updated_at: '2026-08-15T00:00:00Z',
  });
  assert.equal(transaction.scope, 'unknown');
});
