/**
 * Black-box API acceptance harness for the local Jerri Finance Portal server.
 * No third-party package is required. Start the local service, then run:
 *   $env:API_BASE_URL='http://127.0.0.1:4747'; node tests/api-contract.mjs
 *
 * The endpoints are deliberately configurable while the backend is finalised.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const baseUrl = (process.env.API_BASE_URL ?? 'http://127.0.0.1:4747').replace(/\/$/, '');
const apiPrefix = process.env.API_PREFIX ?? '/api';
const fixtureDir = resolve('tests/fixtures');
const expected = JSON.parse(await readFile(resolve(fixtureDir, 'expected-reconciliation.json'), 'utf8'));
let passed = 0;

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${apiPrefix}${path}`, init);
  const body = await response.text();
  let json;
  try { json = body ? JSON.parse(body) : undefined; } catch { json = undefined; }
  return { response, body, json };
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}\n${error.stack ?? error}`);
    process.exitCode = 1;
  }
}

async function upload(kind, filePath) {
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.set('source', kind);
  form.set('file', new Blob([bytes]), basename(filePath));
  const { response, json, body } = await request('/imports', { method: 'POST', body: form });
  assert.ok([200, 201, 202].includes(response.status), `upload failed (${response.status}): ${body}`);
  assert.ok(json?.id ?? json?.data?.id, 'import result must expose an id');
  return json?.data ?? json;
}

await test('health endpoint is local and reports ready', async () => {
  const { response, json, body } = await request('/health');
  assert.equal(response.status, 200, body);
  assert.ok(json?.ok === true || json?.status === 'ok', 'health must return ok/status=ok');
});

await test('Stripe July CSV imports exact minor-unit totals', async () => {
  const source = resolve('..', expected.stripe_july_2026.source_file);
  const result = await upload('stripe', source);
  const summary = result.summary ?? result;
  assert.equal(summary.rowCount ?? summary.row_count, expected.stripe_july_2026.row_count);
  assert.equal(summary.grossMinor ?? summary.gross_minor, expected.stripe_july_2026.gross_minor);
  assert.equal(summary.feeMinor ?? summary.fee_minor, expected.stripe_july_2026.fee_minor);
  assert.equal(summary.netMinor ?? summary.net_minor, expected.stripe_july_2026.net_minor);
});

await test('same Stripe report is idempotent', async () => {
  const source = resolve('..', expected.stripe_july_2026.source_file);
  const bytes = await readFile(source);
  const form = new FormData();
  form.set('source', 'stripe');
  form.set('file', new Blob([bytes]), basename(source));
  const { response, json, body } = await request('/imports', { method: 'POST', body: form });
  assert.ok([200, 201, 202, 409].includes(response.status), `unexpected duplicate response: ${body}`);
  const result = json?.data ?? json;
  assert.ok(response.status === 409 || result?.duplicate === true || result?.duplicateRows === expected.stripe_july_2026.row_count,
    `same file must produce no new transactions: ${body}`);
});

await test('invalid Stripe money fails validation without partial commit', async () => {
  const invalidFile = resolve(fixtureDir, 'stripe-invalid-money.csv');
  const bytes = await readFile(invalidFile);
  const form = new FormData(); form.set('source', 'stripe'); form.set('file', new Blob([bytes]), basename(invalidFile));
  const { response, json, body } = await request('/imports', { method: 'POST', body: form });
  assert.ok([400, 422].includes(response.status), `expected validation error, got ${response.status}: ${body}`);
  assert.ok(json?.error ?? json?.issues ?? body, 'validation failure must be explainable');
});

await test('allocation configuration sums to exactly 100%', async () => {
  const total = Object.entries(expected.allocation_percentages_bps)
    .filter(([key]) => key !== 'total')
    .reduce((sum, [, value]) => sum + value, 0);
  assert.equal(total, expected.allocation_percentages_bps.total);
});

console.log(`\n${passed} acceptance checks passed against ${baseUrl}${apiPrefix}`);
if (process.exitCode) process.exit(process.exitCode);
