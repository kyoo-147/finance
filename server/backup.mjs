import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.mjs';

const FORMAT = 'jerri-finance-backup';
const VERSION = 1;
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

export function createBackupBundle(db, databaseFile = config.databaseFile) {
  // A checkpoint folds WAL pages into the main file, so this single-file export is consistent.
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  const database = fs.readFileSync(databaseFile);
  const manifest = {
    format: FORMAT,
    version: VERSION,
    createdAt: new Date().toISOString(),
    database: 'jerri-finance.sqlite',
    byteLength: database.length,
    sha256: sha256(database),
  };
  return { manifest, encoded: Buffer.from(JSON.stringify({ manifest, databaseBase64: database.toString('base64') }), 'utf8') };
}

function validateDatabase(file) {
  const candidate = new DatabaseSync(file, { open: true });
  try {
    const integrity = candidate.prepare('PRAGMA integrity_check').get()?.integrity_check;
    if (integrity !== 'ok') throw new Error('SQLite integrity check failed');
    const required = ['profiles', 'transactions', 'import_jobs', 'settings'];
    const present = new Set(candidate.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
    if (!required.every(name => present.has(name))) throw new Error('Backup does not contain a Jerri Finance database');
  } finally { candidate.close(); }
}

export function decodeAndValidateBackup(raw) {
  if (!Buffer.isBuffer(raw) || raw.length === 0 || raw.length > MAX_BACKUP_BYTES * 2) throw Object.assign(new Error('Backup file is empty or exceeds the safe size limit.'), { status: 400 });
  let bundle;
  try { bundle = JSON.parse(raw.toString('utf8')); } catch { throw Object.assign(new Error('Backup file is not valid JSON.'), { status: 400 }); }
  const { manifest, databaseBase64 } = bundle ?? {};
  if (!manifest || manifest.format !== FORMAT || manifest.version !== VERSION || typeof databaseBase64 !== 'string') throw Object.assign(new Error('This is not a compatible Jerri Finance backup.'), { status: 400 });
  const database = Buffer.from(databaseBase64, 'base64');
  if (!database.length || database.length > MAX_BACKUP_BYTES || database.length !== manifest.byteLength || sha256(database) !== manifest.sha256) throw Object.assign(new Error('Backup checksum or size verification failed.'), { status: 400 });
  const temp = path.join(os.tmpdir(), `jerri-restore-check-${crypto.randomUUID()}.sqlite`);
  try { fs.writeFileSync(temp, database, { mode: 0o600 }); validateDatabase(temp); }
  finally { fs.rmSync(temp, { force: true }); }
  return { manifest, database };
}

export function replaceDatabaseSafely(currentDb, database, openDatabase, databaseFile = config.databaseFile) {
  const target = databaseFile;
  const dir = path.dirname(target);
  const staged = path.join(dir, `.jerri-restore-${crypto.randomUUID()}.sqlite`);
  const previous = path.join(dir, `.jerri-previous-${Date.now()}.sqlite`);
  fs.writeFileSync(staged, database, { mode: 0o600 });
  currentDb.close();
  try {
    if (fs.existsSync(target)) fs.renameSync(target, previous);
    fs.renameSync(staged, target);
    const reopened = openDatabase(target);
    fs.rmSync(previous, { force: true });
    return reopened;
  } catch (error) {
    fs.rmSync(staged, { force: true });
    if (!fs.existsSync(target) && fs.existsSync(previous)) fs.renameSync(previous, target);
    throw error;
  }
}
