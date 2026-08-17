import { id, audit, seed } from './db.mjs';
import { parseCsv, moneyToMinor, sha256 } from './csv.mjs';
import { adapterFor } from './adapters.mjs';
import { parsePdfImport } from './pdf-import.mjs';

const now = () => new Date().toISOString();
const one = (db, sql, ...args) => db.prepare(sql).get(...args);
const all = (db, sql, ...args) => db.prepare(sql).all(...args);
const fingerprint = (source, row) => sha256(Buffer.from([source, row.occurredOn, row.amountMinor, row.description.toLowerCase(), row.externalId || ''].join('|')));
export function financialYearLabel(month, startMonth = 7) { const year = month ? Number(String(month).slice(0, 4)) : new Date().getFullYear(); const monthNumber = month ? Number(String(month).slice(5, 7)) : new Date().getMonth() + 1; const startYear = monthNumber >= startMonth ? year : year - 1; return `FY ${startYear}-${String(startYear + 1).slice(-2)}`; }

function ruleFor(db, description) {
  return one(db, "SELECT * FROM category_rules WHERE ? LIKE '%' || pattern || '%' ORDER BY priority ASC, created_at ASC, id ASC LIMIT 1", description.toLowerCase());
}

function ruleApplied(db, item) {
  const rule = ruleFor(db, item.description);
  if (rule) {
    const isBusiness = Boolean(rule.is_business);
    return { ...item, categoryId: rule.category_id, isBusiness, includeInProfit: isBusiness && Boolean(rule.include_in_profit), reviewStatus: 'auto_categorized' };
  }
  if (item.source === 'stripe') return { ...item, categoryId: 'income-stripe', isBusiness: true, includeInProfit: true, reviewStatus: 'reviewed' };
  if (item.source === 'xero') return { ...item, categoryId: 'income-xero', isBusiness: false, includeInProfit: false, reviewStatus: 'reviewed' };
  return { ...item, categoryId: 'uncategorized', isBusiness: false, includeInProfit: false, reviewStatus: 'needs_review' };
}

function summaryPeriod(summary) {
  return { periodStart: summary?.payPeriodStart || summary?.statementStart || null, periodEnd: summary?.payPeriodEnd || summary?.statementEnd || null };
}

function parseSummary(row) {
  try { return row?.summary_json ? JSON.parse(row.summary_json) : null; } catch { return null; }
}

export function toImport(row) {
  const summary = parseSummary(row);
  return {
    id: row.id, sourceAccountId: row.source_account_id, fileName: row.file_name, fileHash: row.content_hash,
    status: row.status === 'staged' ? 'review_required' : row.status, progress: row.status === 'committed' || row.status === 'reverted' ? 100 : 75,
    uploadedAt: row.created_at, committedAt: row.committed_at, revertedAt: row.reverted_at,
    rowCount: row.total_rows, acceptedRows: row.accepted_rows, rejectedRows: row.rejected_rows,
    duplicateRows: row.duplicate_rows ?? 0, issuesCount: row.rejected_rows, periodStart: row.period_start, periodEnd: row.period_end,
    summary, errorMessage: row.error_message,
  };
}

export function getImport(db, idValue) {
  const job = one(db, 'SELECT * FROM import_jobs WHERE id=?', idValue);
  if (!job) return null;
  return { ...toImport(job), rows: all(db, 'SELECT * FROM import_staging WHERE import_job_id=? ORDER BY row_number', idValue) };
}

export async function stageImport(db, { sourceAccountId, fileName, buffer }) {
  const account = one(db, 'SELECT * FROM accounts WHERE id = ? AND active = 1', sourceAccountId);
  if (!account) throw Object.assign(new Error('Unknown or inactive source account'), { status: 400 });
  const fileHash = sha256(buffer);
  const previous = one(db, 'SELECT id, status FROM import_jobs WHERE content_hash = ?', fileHash);
  if (previous && previous.status !== 'reverted') throw Object.assign(new Error('This exact file has already been imported.'), { status: 409, importId: previous.id });
  const contentHash = previous?.status === 'reverted' ? sha256(Buffer.from(`${fileHash}|${now()}|${crypto.randomUUID()}`)) : fileHash;
  const adapter = adapterFor(account.source_type);
  if (!adapter) throw Object.assign(new Error('No import adapter is available for this source.'), { status: 400 });
  const isPdf = /\.pdf$/i.test(fileName) || buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (isPdf && account.source_type === 'stripe') throw Object.assign(new Error('Stripe imports require the Itemised Payouts CSV export.'), { status: 400 });
  let document;
  if (isPdf) document = await parsePdfImport(account.source_type, buffer);
  else {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
    catch { throw Object.assign(new Error('The CSV is not valid UTF-8 text. Export it again as UTF-8 CSV.'), { status: 422 }); }
    try { document = { rows: parseCsv(text), summary: null }; } catch (error) { throw Object.assign(new Error(error.message), { status: 422 }); }
  }
  const rows = document.rows;
  if (!rows.length) throw Object.assign(new Error('The file contains no importable rows.'), { status: 422 });
  const jobId = id('import');
  db.prepare('INSERT INTO import_jobs (id,source_account_id,file_name,content_hash,status,created_at) VALUES (?, ?, ?, ?, \'staged\', ?)').run(jobId, sourceAccountId, fileName, contentHash, now());
  let accepted = 0; let rejected = 0; let duplicateRows = 0;
  const insert = db.prepare('INSERT INTO import_staging VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const stagedFingerprints = new Set();
  for (const raw of rows) {
    try {
      const item = ruleApplied(db, { ...adapter(raw), source: account.source_type });
      const fp = fingerprint(account.source_type, item);
      const duplicate = stagedFingerprints.has(fp) || Boolean(one(db, 'SELECT id FROM transactions WHERE source_fingerprint = ?', fp));
      stagedFingerprints.add(fp);
      insert.run(id('stage'), jobId, raw.__row, JSON.stringify(raw), item.occurredOn, item.description, item.amountMinor, item.kind, fp, null, duplicate ? 'duplicate' : 'ready');
      accepted++; if (duplicate) duplicateRows++;
    } catch (error) {
      insert.run(id('stage'), jobId, raw.__row, JSON.stringify(raw), null, null, null, null, null, `error: ${error.message}`, 'error');
      rejected++;
    }
  }
  if (rejected > 0) {
    db.prepare("UPDATE import_jobs SET total_rows=?, accepted_rows=?, rejected_rows=?, duplicate_rows=?, status='failed', error_message=? WHERE id=?")
      .run(rows.length, accepted, rejected, duplicateRows, `${rejected} row(s) could not be parsed. No transactions were committed.`, jobId);
    throw Object.assign(new Error(`Import rejected: ${rejected} row(s) have invalid data. Fix the file and try again.`), { status: 422, importId: jobId });
  }
  const summary = { rowCount: rows.length, acceptedRows: accepted - duplicateRows, duplicateRows, ...document.summary, netMinor: rows.reduce((sum, row) => { const value = row.net ?? row.Net ?? row.Amount ?? row.amount ?? row['Net Pay'] ?? row['Net amount'] ?? 0; try { return sum + moneyToMinor(value); } catch { return sum; } }, 0) };
  const period = summaryPeriod(summary);
  if (account.source_type === 'stripe') {
    summary.grossMinor = rows.reduce((sum, row) => sum + moneyToMinor(row.gross ?? row.Gross ?? row.net ?? row.Net ?? row.Amount ?? row.amount ?? 0), 0);
    summary.feeMinor = summary.grossMinor - rows.reduce((sum, row) => sum + moneyToMinor(row.net ?? row.Net ?? row.Amount ?? row.amount ?? 0), 0);
  }
  db.prepare('UPDATE import_jobs SET total_rows=?, accepted_rows=?, rejected_rows=?, duplicate_rows=?, period_start=?, period_end=?, summary_json=? WHERE id=?')
    .run(rows.length, accepted - duplicateRows, rejected, duplicateRows, period.periodStart, period.periodEnd, JSON.stringify(summary), jobId);
  audit(db, 'import_job', jobId, 'staged', null, { fileName, sourceAccountId, totalRows: rows.length, accepted, rejected, duplicateRows, summary });
  return getImport(db, jobId);
}

function dateMatch(db, amountMinor, occurredOn, excludeId = null) {
  return one(db, `SELECT id FROM transactions WHERE source_account_id='stripe' AND kind='income' AND ABS(amount_minor)=ABS(?) AND reconciled_transaction_id IS NULL AND (? IS NULL OR id <> ?) AND date(occurred_on) BETWEEN date(?, '-3 day') AND date(?, '+3 day') ORDER BY ABS(julianday(occurred_on)-julianday(?)), created_at LIMIT 1`, amountMinor, excludeId, excludeId, occurredOn, occurredOn, occurredOn);
}

function reconcilePair(db, firstId, secondId) {
  db.prepare("UPDATE transactions SET reconciliation_status='matched', reconciled_transaction_id=?, kind=CASE WHEN source_account_id='bank' THEN 'transfer' ELSE kind END, is_business=CASE WHEN source_account_id='bank' THEN 0 ELSE is_business END, include_in_profit=CASE WHEN source_account_id='bank' THEN 0 ELSE include_in_profit END, review_status=CASE WHEN source_account_id='bank' THEN 'needs_review' ELSE review_status END, updated_at=? WHERE id=?")
    .run(secondId, now(), firstId);
  db.prepare("UPDATE transactions SET reconciliation_status='matched', reconciled_transaction_id=?, kind=CASE WHEN source_account_id='bank' THEN 'transfer' ELSE kind END, is_business=CASE WHEN source_account_id='bank' THEN 0 ELSE is_business END, include_in_profit=CASE WHEN source_account_id='bank' THEN 0 ELSE include_in_profit END, review_status=CASE WHEN source_account_id='bank' THEN 'needs_review' ELSE review_status END, updated_at=? WHERE id=?")
    .run(firstId, now(), secondId);
  audit(db, 'reconciliation', `${firstId}:${secondId}`, 'matched', null, { firstId, secondId });
}

function reconcileNewTransaction(db, transactionId) {
  const row = one(db, 'SELECT * FROM transactions WHERE id=?', transactionId);
  if (!row || row.reconciled_transaction_id || !/stripe/i.test(row.description)) return;
  if (row.source_account_id === 'bank') {
    const stripe = dateMatch(db, row.amount_minor, row.occurred_on);
    if (stripe) reconcilePair(db, row.id, stripe.id);
  } else if (row.source_account_id === 'stripe') {
    const bank = one(db, `SELECT id FROM transactions WHERE source_account_id='bank' AND kind IN ('income','transfer') AND reconciled_transaction_id IS NULL AND ABS(amount_minor)=ABS(?) AND description LIKE '%STRIPE%' AND date(occurred_on) BETWEEN date(?, '-3 day') AND date(?, '+3 day') ORDER BY ABS(julianday(occurred_on)-julianday(?)), created_at LIMIT 1`, row.amount_minor, row.occurred_on, row.occurred_on, row.occurred_on);
    if (bank) reconcilePair(db, row.id, bank.id);
  }
}

export function commitImport(db, jobId) {
  const job = one(db, 'SELECT * FROM import_jobs WHERE id=?', jobId);
  if (!job) throw Object.assign(new Error('Import not found'), { status: 404 });
  if (job.status === 'committed') return getImport(db, jobId);
  if (job.status === 'reverted') throw Object.assign(new Error('A reverted import must be uploaded again as a new batch.'), { status: 409 });
  if (job.status === 'failed') throw Object.assign(new Error('A failed import cannot be committed.'), { status: 422 });
  const source = one(db, 'SELECT source_type FROM accounts WHERE id=?', job.source_account_id).source_type;
  let added = 0; let duplicates = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    const insert = db.prepare("INSERT INTO transactions (id,import_job_id,source_account_id,occurred_on,description,amount_minor,currency,kind,category_id,is_business,include_in_profit,review_status,source_fingerprint,external_id,notes,created_at,updated_at,reconciliation_status,reconciled_transaction_id) VALUES (?, ?, ?, ?, ?, ?, 'AUD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unmatched', NULL)");
    for (const stage of all(db, 'SELECT * FROM import_staging WHERE import_job_id=? ORDER BY row_number', jobId)) {
      if (stage.status !== 'ready') { if (stage.status === 'duplicate') duplicates++; continue; }
      const raw = JSON.parse(stage.raw_json); const item = ruleApplied(db, { ...adapterFor(source)(raw), source });
      try { insert.run(id('txn'), job.id, job.source_account_id, item.occurredOn, item.description, item.amountMinor, item.kind, item.categoryId, Number(item.isBusiness), Number(item.includeInProfit), item.reviewStatus, stage.source_fingerprint, item.externalId || null, null, now(), now()); added++; }
      catch (error) { if (String(error.message).includes('UNIQUE')) duplicates++; else throw error; }
      reconcileNewTransaction(db, one(db, 'SELECT id FROM transactions WHERE source_fingerprint=?', stage.source_fingerprint).id);
    }
    db.prepare("UPDATE import_jobs SET status='committed', duplicate_rows=?, committed_at=?, error_message=NULL WHERE id=?").run(duplicates, now(), jobId);
    audit(db, 'import_job', jobId, 'committed', { status: 'staged' }, { added, duplicates });
    db.exec('COMMIT');
    return getImport(db, jobId);
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

function unreconcileForTransaction(db, row) {
  if (!row?.reconciled_transaction_id) return;
  const other = one(db, 'SELECT * FROM transactions WHERE id=?', row.reconciled_transaction_id);
  if (other) {
    db.prepare("UPDATE transactions SET reconciliation_status='unmatched', reconciled_transaction_id=NULL, kind=CASE WHEN source_account_id='bank' THEN CASE WHEN amount_minor >= 0 THEN 'income' ELSE 'expense' END ELSE kind END, updated_at=? WHERE id=?").run(now(), other.id);
  }
}

export function revertImport(db, jobId) {
  const job = one(db, 'SELECT * FROM import_jobs WHERE id=?', jobId);
  if (!job) throw Object.assign(new Error('Import not found'), { status: 404 });
  if (job.status === 'reverted') return getImport(db, jobId);
  if (job.status !== 'committed') throw Object.assign(new Error('Only a committed import can be undone.'), { status: 422 });
  db.exec('BEGIN IMMEDIATE');
  try {
    const rows = all(db, 'SELECT * FROM transactions WHERE import_job_id=?', jobId);
    rows.forEach((row) => unreconcileForTransaction(db, row));
    db.prepare('DELETE FROM transactions WHERE import_job_id=?').run(jobId);
    db.prepare("UPDATE import_jobs SET status='reverted', reverted_at=?, error_message=NULL WHERE id=?").run(now(), jobId);
    audit(db, 'import_job', jobId, 'reverted', { status: 'committed', transactionCount: rows.length }, { status: 'reverted' });
    db.exec('COMMIT');
    return getImport(db, jobId);
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function clearImportedData(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const rows = all(db, "SELECT * FROM transactions WHERE import_job_id IS NOT NULL");
    rows.forEach((row) => unreconcileForTransaction(db, row));
    db.prepare('DELETE FROM transactions WHERE import_job_id IS NOT NULL').run();
    db.prepare("UPDATE import_jobs SET status='reverted', reverted_at=COALESCE(reverted_at, ?)").run(now());
    audit(db, 'workspace', 'finance', 'cleared_imported_data', null, { transactionCount: rows.length });
    db.exec('COMMIT');
    return { cleared: rows.length };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function resetWorkspace(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const table of ['transactions', 'import_staging', 'import_jobs', 'category_rules', 'allocation_rules', 'assets', 'liabilities', 'holdings', 'settings', 'audit_events', 'categories', 'accounts', 'profiles']) db.exec(`DELETE FROM ${table}`);
    seed(db); audit(db, 'workspace', 'finance', 'reset', null, { resetAt: now() }); db.exec('COMMIT');
    return { reset: true };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function createManualTransaction(db, input) {
  const date = String(input.occurredAt || input.occurred_on || ''); const description = String(input.description || input.source || '').trim();
  const amount = Number(input.amountMinor); const type = input.type || 'expense'; const scope = input.scope || 'unknown';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !description || !Number.isSafeInteger(amount) || !['income', 'expense', 'transfer'].includes(type) || !['business', 'personal', 'unknown'].includes(scope)) throw Object.assign(new Error('Date, description, integer cents, type, and scope are required.'), { status: 400 });
  if (scope === 'unknown' || !input.categoryId) throw Object.assign(new Error('Manual transactions require an explicit category and scope.'), { status: 400 });
  const include = scope === 'business' && Boolean(input.includedInProfit);
  const signed = type === 'expense' ? -Math.abs(amount) : type === 'income' ? Math.abs(amount) : amount;
  const transaction = { id: id('txn'), importJobId: null, sourceAccountId: 'manual', occurredOn: date, description, amountMinor: signed, kind: type, categoryId: input.categoryId, isBusiness: scope === 'business', includeInProfit: include, reviewStatus: 'reviewed', notes: input.notes || null, externalId: null };
  db.prepare("INSERT INTO transactions (id,import_job_id,source_account_id,occurred_on,description,amount_minor,currency,kind,category_id,is_business,include_in_profit,review_status,source_fingerprint,external_id,notes,created_at,updated_at,reconciliation_status,reconciled_transaction_id) VALUES (?,NULL,'manual',?,?,?,'AUD',?,?,?,?,?,?,?,NULL,?,?, 'unmatched',NULL)").run(transaction.id, date, description, signed, type, transaction.categoryId, Number(transaction.isBusiness), Number(include), transaction.reviewStatus, sha256(Buffer.from(`manual|${transaction.id}`)), transaction.notes, now(), now());
  const saved = one(db, 'SELECT * FROM transactions WHERE id=?', transaction.id); audit(db, 'transaction', transaction.id, 'created', null, saved); return toTransaction(saved);
}

export function deleteManualTransaction(db, transactionId) {
  const row = one(db, "SELECT * FROM transactions WHERE id=? AND import_job_id IS NULL AND source_account_id='manual'", transactionId);
  if (!row) throw Object.assign(new Error('Only manual transactions can be deleted.'), { status: 404 });
  db.prepare('DELETE FROM transactions WHERE id=?').run(transactionId); audit(db, 'transaction', transactionId, 'deleted', row, null); return { deleted: true };
}

export function toTransaction(row) {
  return {
    id: row.id, importJobId: row.import_job_id ?? undefined, occurredAt: row.occurred_on, description: row.description, sourceAccountId: row.source_account_id,
    amountMinor: row.amount_minor, currency: row.currency, type: row.kind, scope: row.review_status === 'needs_review' ? 'unknown' : row.is_business ? 'business' : 'personal',
    categoryId: row.category_id ?? 'uncategorized', includedInProfit: Boolean(row.include_in_profit), reviewStatus: row.review_status, duplicateStatus: 'clear', notes: row.notes ?? undefined,
    reconciliationStatus: row.reconciliation_status ?? 'unmatched', reconciledTransactionId: row.reconciled_transaction_id ?? undefined, isManual: row.import_job_id === null,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function toRule(row) {
  return { id: row.id, priority: row.priority, enabled: true, conditions: [{ field: 'description', operator: 'contains', value: row.pattern }], action: { categoryId: row.category_id, scope: row.is_business ? 'business' : 'personal', includedInProfit: Boolean(row.is_business && row.include_in_profit) } };
}
export function toAllocation(row) { return { id: row.id, name: row.name, percentageBps: row.percentage_bps, enabled: Boolean(row.active), order: row.sort_order }; }
export function toHolding(row) { return { id: row.id, name: row.name, category: row.category ?? 'etf', units: row.units ?? undefined, currentValueMinor: row.value_minor, monthlyContributionMinor: row.monthly_contribution_minor || undefined, returnMtdMinor: row.return_mtd_minor || undefined, annualReturnMinor: row.annual_return_minor || undefined, asOf: row.as_of_date }; }

function settingsDto(db) {
  const defaults = { importPreferences: { defaultImportSource: 'stripe', autoImport: true, deduplicate: true, defaultTaxRateBps: 2500 }, notifications: { weeklySummary: false, lowCashFlowAlert: true, transactionImportIssues: true, profitAllocationUpdated: true, marketing: false }, security: { twoFactorEnabled: false, activeSessions: 1 } };
  for (const row of all(db, 'SELECT * FROM settings')) try { defaults[row.key] = JSON.parse(row.value); } catch { /* ignore malformed optional settings */ }
  return defaults;
}

export function bootstrap(db) {
  const profile = one(db, 'SELECT * FROM profiles LIMIT 1'); let savedProfile = {};
  try { savedProfile = JSON.parse(one(db, "SELECT value FROM settings WHERE key='profile' LIMIT 1")?.value ?? '{}'); } catch { /* ignore */ }
  const defaultProfile = { id: profile.id, name: 'Jerri Zerafa Finance', type: 'Sole trader', abn: '', ownerName: profile.display_name, email: '', currency: profile.currency, financialYearStartMonth: 7 };
  return {
    businessProfile: { ...defaultProfile, ...savedProfile }, connectedAccounts: all(db, 'SELECT * FROM accounts ORDER BY name').map((row) => ({ id: row.id, provider: row.source_type, displayName: row.name, status: row.active ? 'connected' : 'disconnected' })),
    categories: all(db, 'SELECT * FROM categories ORDER BY kind,name').map((row) => ({ id: row.id, name: row.name })), transactions: all(db, 'SELECT * FROM transactions ORDER BY occurred_on DESC, created_at DESC').map(toTransaction), importJobs: all(db, 'SELECT * FROM import_jobs ORDER BY created_at DESC').map(toImport),
    categoryRules: all(db, 'SELECT * FROM category_rules ORDER BY priority, created_at, id').map(toRule), allocationRules: all(db, 'SELECT * FROM allocation_rules ORDER BY sort_order').map(toAllocation),
    assets: all(db, 'SELECT * FROM assets ORDER BY as_of_date DESC').map((row) => ({ id: row.id, name: row.name, category: row.category ?? 'savings', valueMinor: row.amount_minor, asOf: row.as_of_date, currency: 'AUD' })),
    liabilities: all(db, 'SELECT * FROM liabilities ORDER BY as_of_date DESC').map((row) => ({ id: row.id, name: row.name, category: row.category ?? 'credit_card', balanceMinor: row.amount_minor, asOf: row.as_of_date, currency: 'AUD' })), holdings: all(db, 'SELECT * FROM holdings ORDER BY as_of_date DESC').map(toHolding), settings: settingsDto(db),
    activityEvents: all(db, 'SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 200').map((row) => ({ id: row.id, timestamp: row.created_at, title: row.action, description: `${row.entity_type} ${row.entity_id}`, type: row.entity_type === 'import_job' ? 'import' : row.entity_type === 'transaction' ? 'transaction' : row.entity_type === 'allocation_rules' ? 'allocation' : 'system' })),
  };
}

export function dashboard(db, month = null) {
  const filter = month ? ' AND substr(occurred_on,1,7)=?' : ''; const args = month ? [month] : [];
  const rows = all(db, `SELECT substr(occurred_on,1,7) month, kind, SUM(amount_minor) amount_minor FROM transactions WHERE include_in_profit=1${filter} GROUP BY month,kind ORDER BY month`, ...args);
  const totals = one(db, `SELECT COALESCE(SUM(CASE WHEN kind='income' THEN amount_minor ELSE 0 END),0) income_minor, COALESCE(SUM(CASE WHEN kind='expense' THEN -amount_minor ELSE 0 END),0) expense_minor FROM transactions WHERE include_in_profit=1${filter}`, ...args);
  const profit = totals.income_minor - totals.expense_minor; const allocation = allocateProfit(profit, all(db, 'SELECT id,name,percentage_bps,sort_order FROM allocation_rules WHERE active=1 ORDER BY sort_order'));
  return { currency: 'AUD', month, totals: { ...totals, profit_minor: profit }, monthly: rows, allocations: allocation, needsReview: one(db, "SELECT COUNT(*) count FROM transactions WHERE review_status='needs_review'").count };
}

export function allocateProfit(profitMinor, rules) {
  const available = Math.max(0, profitMinor); const totalBps = rules.reduce((sum, rule) => sum + Number(rule.percentage_bps ?? rule.percentageBps ?? 0), 0);
  const calculated = rules.map((rule, index) => { const bps = Number(rule.percentage_bps ?? rule.percentageBps ?? 0); const numerator = available * bps; return { ...rule, amount_minor: Math.floor(numerator / 10000), _remainder: numerator % 10000, _index: index }; });
  let remaining = totalBps === 10000 ? available - calculated.reduce((sum, row) => sum + row.amount_minor, 0) : 0;
  calculated.sort((a, b) => b._remainder - a._remainder || Number(a.sort_order ?? a.order ?? a._index) - Number(b.sort_order ?? b.order ?? b._index));
  for (let index = 0; remaining > 0 && calculated.length; index = (index + 1) % calculated.length, remaining--) calculated[index].amount_minor++;
  return calculated.sort((a, b) => a._index - b._index).map(({ _remainder, _index, ...row }) => row);
}

export function updateTransaction(db, transactionId, input) {
  const before = one(db, 'SELECT * FROM transactions WHERE id=?', transactionId); if (!before) throw Object.assign(new Error('Transaction not found'), { status: 404 });
  const requestedScope = input.scope ?? (input.is_business === undefined ? undefined : input.is_business ? 'business' : 'personal');
  const requestedReview = input.reviewStatus ?? input.review_status;
  if (requestedReview === 'reviewed' && !['business', 'personal'].includes(requestedScope ?? '')) throw Object.assign(new Error('Choose Business or Personal scope before completing review.'), { status: 400 });
  if (requestedScope === 'unknown') input.includeInProfit = false;
  if (requestedScope && requestedScope !== 'business') input.includeInProfit = false;
  const inputSql = { ...input, category_id: input.categoryId ?? input.category_id, include_in_profit: input.includedInProfit ?? input.include_in_profit, review_status: requestedReview, is_business: requestedScope === undefined ? input.is_business : requestedScope === 'business', occurred_on: input.occurredAt ?? input.occurred_on, amount_minor: input.amountMinor ?? input.amount_minor, kind: input.type ?? input.kind };
  if (before.import_job_id === null && inputSql.amount_minor !== undefined && inputSql.kind) inputSql.amount_minor = inputSql.kind === 'expense' ? -Math.abs(Number(inputSql.amount_minor)) : inputSql.kind === 'income' ? Math.abs(Number(inputSql.amount_minor)) : Number(inputSql.amount_minor);
  const allowed = ['category_id', 'is_business', 'include_in_profit', 'review_status', 'notes', 'description', 'occurred_on', 'amount_minor', 'kind']; const fields = []; const values = [];
  for (const key of allowed) if (Object.hasOwn(inputSql, key) && inputSql[key] !== undefined) { fields.push(`${key}=?`); values.push(['is_business', 'include_in_profit'].includes(key) ? Number(Boolean(inputSql[key])) : inputSql[key]); }
  if (requestedScope === 'business' && inputSql.include_in_profit === undefined) { fields.push('include_in_profit=?'); values.push(0); }
  if (requestedScope && requestedScope !== 'unknown' && inputSql.review_status === undefined) { fields.push('review_status=?'); values.push('reviewed'); }
  if (!fields.length) return toTransaction(before);
  fields.push('updated_at=?'); values.push(now(), transactionId); db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id=?`).run(...values);
  const after = one(db, 'SELECT * FROM transactions WHERE id=?', transactionId); audit(db, 'transaction', transactionId, 'updated', before, after); return toTransaction(after);
}
