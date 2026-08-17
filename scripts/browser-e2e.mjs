import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import WebSocket from 'ws';

const port = 4777;
const base = `http://127.0.0.1:${port}`;
const dataDir = await mkdtemp(join(tmpdir(), 'jerri-browser-e2e-'));
let server;
function launchServer() {
  server = spawn(process.execPath, ['server/index.mjs'], {
    cwd: resolve('.'),
    env: { ...process.env, JERRI_PORT: String(port), JERRI_DATA_DIR: dataDir },
    stdio: 'ignore',
  });
}
launchServer();

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('local server did not start');
}

const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
const target = targets.find((t) => t.type === 'page');
assert.ok(target, 'Chrome must have an active page target');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
let commandId = 0;
const pending = new Map();
ws.on('message', (raw) => {
  const message = JSON.parse(raw);
  if (message.method === 'Fetch.requestPaused') ws.send(JSON.stringify({ id: ++commandId, method: 'Fetch.failRequest', params: { requestId: message.params.requestId, errorReason: 'Failed' } }));
  if (message.id && pending.has(message.id)) {
    const item = pending.get(message.id);
    pending.delete(message.id);
    message.error ? item.reject(new Error(`${item.method}: ${message.error.message}`)) : item.resolve(message.result);
  }
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result?.value;
}
async function waitFor(expression, label) {
  for (let i = 0; i < 100; i++) {
    try { if (await evaluate(expression)) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timeout: ${label}`);
}
async function click(text) {
  const ok = await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim().includes(${JSON.stringify(text)})); b?.click(); return !!b})()`);
  assert.ok(ok, `button not found: ${text}`);
}
async function fill(selector, value) {
  await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw new Error('input not found'); const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set; setter.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
}
async function capture(name) {
  const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(`tests/artifacts/ui-e2e/${name}.png`, Buffer.from(screenshot.data, 'base64'));
}
async function navigate() {
  await cdp('Page.navigate', { url: `${base}/` });
  await waitFor(`document.body && document.body.innerText.includes('Upload Reports')`, 'overview');
}
async function selectAccount(account) {
  await evaluate(`(()=>{const el=document.querySelector('select'); const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set; setter.call(el,${JSON.stringify(account)}); el.dispatchEvent(new Event('change',{bubbles:true})); return el.value})()`);
}
async function fileInput(file) {
  const { root } = await cdp('DOM.getDocument');
  const { nodeId } = await cdp('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' });
  assert.ok(nodeId, 'file input not found');
  await cdp('DOM.setFileInputFiles', { nodeId, files: [resolve(file)] });
}
async function upload(account, file, marker) {
  await selectAccount(account);
  await fileInput(file);
  await waitFor(`document.body.innerText.includes('Preview & Confirm')`, `${account} import preview`);
  await click('Preview & Confirm');
  await waitFor(`document.body.innerText.includes('Import Preview')`, `${account} preview dialog`);
  await click('Confirm Import');
  await waitFor(`(()=>{const row=[...document.querySelectorAll('tr')].find(x=>x.innerText.includes(${JSON.stringify(marker)})); return !!row && row.innerText.includes('Completed')})()`, `${account} import commit`);
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([new Promise((resolve) => server.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 5000))]);
}

try {
  await waitForServer();
  await navigate();
  await capture('UI-01-automated-overview');

  await click('Net Worth');
  await waitFor(`document.body.innerText.includes('Net Worth & Holdings')`, 'net worth');
  await click('+ Add Asset');
  await fill('input[placeholder="e.g. High Yield Savings Account"]', 'Browser E2E Reserve');
  await fill('input[type="number"]', '1234.56');
  await evaluate(`(()=>{const el=document.querySelector('select'); const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set; setter.call(el,'vehicle'); el.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  await click('Save Asset');
  await waitFor(`document.body.innerText.includes('Browser E2E Reserve')`, 'asset create');
  await evaluate(`document.querySelector('button[title="Edit asset"]')?.click()`);
  await fill('input[placeholder="e.g. High Yield Savings Account"]', 'Browser E2E Reserve Updated');
  await click('Save Asset');
  await waitFor(`document.body.innerText.includes('Browser E2E Reserve Updated')`, 'asset update');
  await click('+ Add Liability');
  await fill('input[placeholder="e.g. Business Line of Credit"]', 'Browser E2E Liability');
  await fill('input[type="number"]', '321.00');
  await evaluate(`(()=>{const el=document.querySelector('select'); const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set; setter.call(el,'mortgage'); el.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  await click('Save Liability');
  await waitFor(`document.body.innerText.includes('Browser E2E Liability')`, 'liability create');
  await evaluate(`document.querySelector('button[title=\"Edit liability\"]')?.click()`);
  await fill('input[placeholder=\"e.g. Business Line of Credit\"]', 'Browser E2E Liability Updated');
  await click('Save Liability');
  await waitFor(`document.body.innerText.includes('Browser E2E Liability Updated')`, 'liability update');
  const afterLiabilityCategory = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.equal(afterLiabilityCategory.liabilities.find((x) => x.name === 'Browser E2E Liability Updated')?.category, 'mortgage', 'liability category did not round-trip');

  await click('Imports');
  await waitFor(`document.body.innerText.includes('Import Statements & Data Feeds')`, 'imports');
  await upload('stripe', 'tests/fixtures/stripe-browser.csv', '1');
  if (existsSync(resolve('../PaySlip (7).pdf'))) await upload('xero', '../PaySlip (7).pdf', 'PaySlip (7).pdf');
  if (existsSync(resolve('../Expenses Statement.pdf'))) await upload('bank', '../Expenses Statement.pdf', 'Expenses Statement.pdf');

  // Real browser rollback acceptance: isolate one committed batch and verify its full lifecycle.
  const rollbackFile = join(dataDir, 'rollback-acceptance.csv');
  await writeFile(rollbackFile, Buffer.from('payout_id,effective_at,currency,gross,fee,net,description\nrollback-acceptance,2026-07-25 10:00:00,aud,100.00,0.00,100.00,ROLLBACK ACCEPTANCE\n'));
  const rollbackBefore = await evaluate(`Promise.all([fetch('/api/dashboard?month=2026-07').then(r=>r.json()), fetch('/api/bootstrap').then(r=>r.json())])`);
  await upload('stripe', rollbackFile, 'rollback-acceptance.csv');
  const rollbackAfter = await evaluate(`Promise.all([fetch('/api/dashboard?month=2026-07').then(r=>r.json()), fetch('/api/bootstrap').then(r=>r.json())])`);
  assert.equal(rollbackAfter[1].transactions.filter((t) => t.description.includes('ROLLBACK ACCEPTANCE')).length, 1, 'rollback batch was not committed');
  assert.notEqual(rollbackAfter[0].totals.income_minor, rollbackBefore[0].totals.income_minor, 'rollback batch did not change dashboard');
  const rollbackJob = rollbackAfter[1].importJobs.find((job) => job.fileName === 'rollback-acceptance.csv');
  assert.ok(rollbackJob?.status === 'committed', 'rollback batch is not committed');
  await evaluate(`window.confirm=()=>true`);
  await evaluate(`document.querySelector('button[data-import-id="${rollbackJob.id}"]')?.click()`);
  await waitFor(`(()=>{const row=[...document.querySelectorAll('tr')].find(x=>x.innerText.includes('rollback-acceptance.csv')); return !!row && row.innerText.includes('Reverted')})()`, 'undo import');
  const rollbackUndo = await evaluate(`Promise.all([fetch('/api/dashboard?month=2026-07').then(r=>r.json()), fetch('/api/bootstrap').then(r=>r.json())])`);
  assert.equal(rollbackUndo[1].transactions.filter((t) => t.description.includes('ROLLBACK ACCEPTANCE')).length, 0, 'undo left batch transactions');
  assert.equal(rollbackUndo[0].totals.income_minor, rollbackBefore[0].totals.income_minor, 'undo did not restore dashboard');
  assert.equal(rollbackUndo[1].transactions.length, rollbackBefore[1].transactions.length, 'undo removed unrelated transactions');
  assert.equal(rollbackUndo[1].transactions.filter((t) => t.sourceAccountId === 'bank' && t.reconciliationStatus === 'matched').length, rollbackBefore[1].transactions.filter((t) => t.sourceAccountId === 'bank' && t.reconciliationStatus === 'matched').length, 'undo did not restore reconciliation');
  await stopServer(); launchServer(); await waitForServer(); await navigate();
  const rollbackRestart = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.equal(rollbackRestart.transactions.filter((t) => t.description.includes('ROLLBACK ACCEPTANCE')).length, 0, 'reverted state did not persist after restart');
  const afterAssetCategory = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.equal(afterAssetCategory.assets.find((x) => x.name === 'Browser E2E Reserve Updated')?.category, 'vehicle', 'asset category did not round-trip');
  const afterImports = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.ok(afterImports.importJobs.length >= 1 && afterImports.transactions.length >= 1, 'imports did not persist');

  await click('Transactions');
  await waitFor(`document.body.innerText.includes('Transactions Ledger')`, 'transactions');
  await evaluate(`document.querySelectorAll('table input[type=checkbox]')[1]?.click()`);
  await click('Set Software');
  await waitFor(`document.body.innerText.includes('Showing')`, 'bulk categorize');
  const reviewed = await evaluate(`fetch('/api/bootstrap').then(r=>r.json()).then(s=>s.transactions.some(t=>t.reviewStatus==='reviewed'))`);
  assert.equal(reviewed, true, 'review action did not persist');
  await evaluate(`document.querySelector('button[title="Edit"]')?.click()`);
  await waitFor(`document.body.innerText.includes('Edit Ledger Entry')`, 'transaction edit modal');
  await evaluate(`(()=>{const el=[...document.querySelectorAll('input[type=text]')].at(-1); const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set; setter.call(el,'Browser E2E transaction edit'); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
  await click('Save');
  await waitFor(`document.body.innerText.includes('Browser E2E transaction edit')`, 'transaction edit');
  await evaluate(`document.querySelector('button[title="Add Rule"]')?.click()`);
  await waitFor(`document.body.innerText.includes('New Categorization Rule')`, 'rule modal');
  await click('Save Rule');
  const afterRule = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.ok(afterRule.categoryRules.length >= 1, 'category rule did not persist');
  await capture('UI-02-transactions-rules');

  await click('Allocation');
  await waitFor(`document.body.innerText.includes('Profit Allocation')`, 'allocation');
  await evaluate(`(()=>{const el=document.querySelectorAll('input[type=number]')[0]; const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set; setter.call(el,'31'); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
  await waitFor(`document.body.innerText.includes('(Target 100%)')`, 'invalid allocation');
  await capture('UI-03-allocation-invalid');
  await evaluate(`(()=>{const el=document.querySelectorAll('input[type=number]')[1]; const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set; setter.call(el,'24'); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
  await click('Save Allocation Rules');
  const afterAllocation = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.equal(afterAllocation.allocationRules.reduce((sum, r) => sum + r.percentageBps, 0), 10000, 'allocation did not reconcile');

  await click('Investments');
  await waitFor(`document.body.innerText.includes('Investments & Wealth')`, 'investments');
  await click('Add holding');
  await fill('input[type="text"]', 'Browser E2E Holding');
  await evaluate(`(()=>{for(const el of document.querySelectorAll('input[type=number]')){const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set;setter.call(el,'100');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}return true})()`);
  await click('Save holding');
  await waitFor(`document.body.innerText.includes('Browser E2E Holding')`, 'holding create');
  const afterHolding = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.ok(afterHolding.holdings.some((x) => x.name === 'Browser E2E Holding'), 'holding did not persist');
  await evaluate(`document.querySelector('button[aria-label=\"Edit Browser E2E Holding\"]')?.click()`);
  await fill('input[type=\"text\"]', 'Browser E2E Holding Updated');
  await click('Save holding');
  await waitFor(`document.body.innerText.includes('Browser E2E Holding Updated')`, 'holding update');
  await click('Add holding');
  await fill('input[type=\"text\"]', 'Browser E2E Holding Delete');
  await click('Save holding');
  await waitFor(`document.body.innerText.includes('Browser E2E Holding Delete')`, 'holding second create');
  await evaluate(`window.confirm=()=>true; document.querySelector('button[aria-label=\"Delete Browser E2E Holding Delete\"]')?.click(); true`);
  await waitFor(`!document.body.innerText.includes('Browser E2E Holding Delete')`, 'holding delete');
  await capture('UI-04-holdings');

  await click('Settings');
  await waitFor(`document.body.innerText.includes('System Settings')`, 'settings');
  await fill('input[type="text"]', 'Browser E2E Profile');
  await click('Save Profile Changes');
  await waitFor(`document.body.innerText.includes('Changes saved successfully')`, 'profile save');
  await evaluate(`[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Notifications')?.click()`);
  await waitFor(`document.body.innerText.includes('Alert & Email Preferences')`, 'notifications');
  await evaluate(`document.querySelector('input[type=checkbox]')?.click()`);
  const afterSettings = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.equal(afterSettings.businessProfile.name, 'Browser E2E Profile', 'profile did not persist');
  await evaluate(`[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Categorization')?.click()`);
  await waitFor(`document.body.innerText.includes('Auto-Categorization Rules')`, 'categorization settings');
  await click('Re-run All Rules');
  const afterRerun = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.ok(afterRerun.activityEvents.some((event) => event.title === 'rule_applied'), 'rule re-run did not create audit evidence');
  await evaluate(`document.querySelector('button[title=\"Delete rule\"]')?.click()`);
  await click('Delete Rule');
  const afterRuleDelete = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.equal(afterRuleDelete.categoryRules.length, 0, 'rule delete did not persist');
  await capture('UI-05-settings');

  // Export a real backup, mutate via UI, then restore through the real restore file input.
  const backupBase64 = await evaluate(`fetch('/api/backups/export').then(r=>r.arrayBuffer()).then(b=>{let s='';for(const x of new Uint8Array(b))s+=String.fromCharCode(x);return btoa(s)})`);
  const backupFile = join(dataDir, 'browser-backup.json');
  await writeFile(backupFile, Buffer.from(backupBase64, 'base64'));
  await click('Net Worth');
  await waitFor(`document.body.innerText.includes('Net Worth & Holdings')`, 'backup mutation page');
  await click('+ Add Asset');
  await fill('input[placeholder="e.g. High Yield Savings Account"]', 'Backup Mutation');
  await fill('input[type="number"]', '77.77');
  await click('Save Asset');
  await waitFor(`document.body.innerText.includes('Backup Mutation')`, 'backup mutation');
  await click('Settings');
  await waitFor(`document.body.innerText.includes('System Settings')`, 'backup settings');
  await evaluate(`[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Local Data')?.click()`);
  await waitFor(`document.body.innerText.includes('Restore a verified backup')`, 'local data');
  await capture('UI-06-destructive-backup-restore');
  await evaluate(`window.confirm=()=>true`);
  await fileInput(backupFile);
  await waitFor(`document.body.innerText.includes('Restored backup')`, 'backup restore');
  await navigate();
  const afterRestore = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.equal(afterRestore.assets.some((x) => x.name === 'Backup Mutation'), false, 'restore did not remove mutation');
  assert.ok(afterRestore.assets.some((x) => x.name === 'Browser E2E Reserve Updated'), 'restore lost prior data');

  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*://127.0.0.1:4777/api/*' }] });
  await cdp('Page.reload');
  await waitFor(`document.body.innerText.includes('Unable to connect')`, 'degraded state');
  await capture('UI-07-degraded-api');
  await cdp('Fetch.disable');
  await navigate();
  const afterRestart = await evaluate(`fetch('/api/bootstrap').then(r=>r.json())`);
  assert.ok(afterRestart.assets.some((x) => x.name === 'Browser E2E Reserve Updated'), 'asset lost after restart');
  assert.ok(afterRestart.holdings.some((x) => x.name === 'Browser E2E Holding Updated'), 'holding lost after restart');

  await click('Imports');
  await waitFor(`document.body.innerText.includes('Import Statements & Data Feeds')`, 'invalid import page');
  await selectAccount('stripe');
  await fileInput('tests/fixtures/stripe-invalid-money.csv');
  await waitFor(`!!document.querySelector('[role=alert]')`, 'invalid import error');
  await capture('UI-08-invalid-import-error');
  console.log('PASS browser E2E: full matrix, backup/restore, restart, degraded/error screenshots');
} finally {
  ws.close();
  await stopServer();
  await rm(dataDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
}
