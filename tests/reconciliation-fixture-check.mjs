/** Verifies that the immutable test expectations still match the supplied Stripe export. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const expected = JSON.parse(await readFile(resolve('tests/fixtures/expected-reconciliation.json'), 'utf8'));
const sourcePath = resolve('..', expected.stripe_july_2026.source_file);
if (!existsSync(sourcePath)) { console.log('SKIP  Private Stripe source fixture is not present; no public fixture was committed.'); process.exit(0); }
const raw = await readFile(sourcePath, 'utf8');
const lines = raw.trim().split(/\r?\n/);
const headers = lines.shift().replaceAll('"', '').split(',');
const rows = lines.map((line) => {
  const fields = [...line.matchAll(/(?:^|,)(?:"([^"]*)"|([^,]*))/g)].map((m) => m[1] ?? m[2]);
  return Object.fromEntries(headers.map((header, index) => [header, fields[index]]));
});
const toMinor = (value) => Math.round(Number(value) * 100);
const total = (column) => rows.reduce((sum, row) => sum + toMinor(row[column]), 0);

assert.equal(rows.length, expected.stripe_july_2026.row_count);
assert.equal(total('gross'), expected.stripe_july_2026.gross_minor);
assert.equal(total('fee'), expected.stripe_july_2026.fee_minor);
assert.equal(total('net'), expected.stripe_july_2026.net_minor);
assert.equal(new Set(rows.map((row) => row.payout_id)).size, expected.stripe_july_2026.unique_payout_ids);
assert.ok(rows.every((row) => row.currency === 'aud'));
assert.ok(rows.every((row) => row.reporting_category === 'payout'));
console.log('PASS  Stripe fixture reconciles to expected-reconciliation.json');
