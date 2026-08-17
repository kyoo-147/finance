import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.mjs';

export function openDatabase(filename = config.databaseFile) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'AUD', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, source_type TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, default_business INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS import_jobs (id TEXT PRIMARY KEY, source_account_id TEXT NOT NULL REFERENCES accounts(id), file_name TEXT NOT NULL, content_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL, total_rows INTEGER NOT NULL DEFAULT 0, accepted_rows INTEGER NOT NULL DEFAULT 0, rejected_rows INTEGER NOT NULL DEFAULT 0, error_message TEXT, duplicate_rows INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, committed_at TEXT);
    CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, import_job_id TEXT REFERENCES import_jobs(id), source_account_id TEXT NOT NULL REFERENCES accounts(id), occurred_on TEXT NOT NULL, description TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'AUD', kind TEXT NOT NULL, category_id TEXT REFERENCES categories(id), is_business INTEGER NOT NULL DEFAULT 0, include_in_profit INTEGER NOT NULL DEFAULT 0, review_status TEXT NOT NULL DEFAULT 'needs_review', source_fingerprint TEXT NOT NULL UNIQUE, external_id TEXT, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS import_staging (id TEXT PRIMARY KEY, import_job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE, row_number INTEGER NOT NULL, raw_json TEXT NOT NULL, occurred_on TEXT, description TEXT, amount_minor INTEGER, kind TEXT, source_fingerprint TEXT, error_message TEXT, status TEXT NOT NULL DEFAULT 'pending');
    CREATE TABLE IF NOT EXISTS category_rules (id TEXT PRIMARY KEY, pattern TEXT NOT NULL UNIQUE, category_id TEXT NOT NULL REFERENCES categories(id), is_business INTEGER NOT NULL, include_in_profit INTEGER NOT NULL, priority INTEGER NOT NULL DEFAULT 100, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS allocation_rules (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, percentage_bps INTEGER NOT NULL CHECK(percentage_bps BETWEEN 0 AND 10000), sort_order INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, name TEXT NOT NULL, amount_minor INTEGER NOT NULL, as_of_date TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'savings', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS liabilities (id TEXT PRIMARY KEY, name TEXT NOT NULL, amount_minor INTEGER NOT NULL, as_of_date TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'credit_card', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS holdings (id TEXT PRIMARY KEY, name TEXT NOT NULL, units REAL, value_minor INTEGER NOT NULL, as_of_date TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, before_json TEXT, after_json TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(occurred_on);
    CREATE INDEX IF NOT EXISTS idx_transactions_import ON transactions(import_job_id);
    CREATE INDEX IF NOT EXISTS idx_staging_job ON import_staging(import_job_id);
  `);
  for (const column of ["duplicate_rows INTEGER NOT NULL DEFAULT 0"]) {
    try { db.exec(`ALTER TABLE import_jobs ADD COLUMN ${column}`); } catch (error) { if (!String(error.message).includes('duplicate column name')) throw error; }
  }
  for (const column of ["category TEXT NOT NULL DEFAULT 'savings'"]) {
    try { db.exec(`ALTER TABLE assets ADD COLUMN ${column}`); } catch (error) { if (!String(error.message).includes('duplicate column name')) throw error; }
  }
  for (const column of ["category TEXT NOT NULL DEFAULT 'credit_card'"]) {
    try { db.exec(`ALTER TABLE liabilities ADD COLUMN ${column}`); } catch (error) { if (!String(error.message).includes('duplicate column name')) throw error; }
  }
  for (const column of ['category TEXT NOT NULL DEFAULT \'etf\'', 'monthly_contribution_minor INTEGER NOT NULL DEFAULT 0', 'return_mtd_minor INTEGER NOT NULL DEFAULT 0', 'annual_return_minor INTEGER NOT NULL DEFAULT 0', 'updated_at TEXT']) {
    try { db.exec(`ALTER TABLE holdings ADD COLUMN ${column}`); } catch (error) { if (!String(error.message).includes('duplicate column name')) throw error; }
  }
  seed(db);
}

function seed(db) {
  const now = new Date().toISOString();
  db.prepare("INSERT OR IGNORE INTO profiles VALUES ('owner', 'Jerri Zerafa', 'AUD', ?)").run(now);
  for (const [id, name, type] of [['stripe','Stripe','stripe'], ['xero','Xero Payslips','xero'], ['bank','Bank Transactions','bank']]) db.prepare('INSERT OR IGNORE INTO accounts VALUES (?, ?, ?, 1, ?)').run(id, name, type, now);
  for (const [id,name,kind,business] of [['income-stripe','Stripe Income','income',1],['income-xero','Employment Income','income',0],['software','Software','expense',1],['travel','Travel','expense',1],['education','Education','expense',1],['personal','Personal','expense',0],['uncategorized','Uncategorised','expense',0]]) db.prepare('INSERT OR IGNORE INTO categories VALUES (?, ?, ?, ?, ?)').run(id,name,kind,business,now);
  const allocations = [['owners-pay',"Owner's Pay",3000,1],['tax','Tax',2500,2],['savings','Savings',1000,3],['investments','Investments',1000,4],['education-fund','Education Fund',500,5],['travel-fund','Travel Fund',500,6],['credit-card-debt','Credit Card Debt',1500,7]];
  for (const [id,name,bps,order] of allocations) db.prepare('INSERT OR IGNORE INTO allocation_rules VALUES (?, ?, ?, ?, 1, ?)').run(id,name,bps,order,now);
}

export function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
export function audit(db, entityType, entityId, action, before, after) { db.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?, ?)').run(id('audit'),entityType,entityId,action,before ? JSON.stringify(before) : null,after ? JSON.stringify(after) : null,new Date().toISOString()); }
