import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createBackupBundle, decodeAndValidateBackup, replaceDatabaseSafely } from './backup.mjs';
import { openDatabase } from './db.mjs';

async function withDatabase(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'jerri-backup-'));
  const file = join(dir, 'jerri-finance.sqlite');
  let db = openDatabase(file);
  try { await fn({ dir, file, get db() { return db; }, set db(next) { db = next; } }); }
  finally { try { db?.close(); } catch {} await rm(dir, { recursive: true, force: true }); }
}

test('backup has a verifiable manifest and detects a one-byte tamper', async () => {
  await withDatabase(async state => {
    state.db.prepare('INSERT INTO assets (id,name,amount_minor,as_of_date,category,created_at) VALUES (?, ?, ?, ?, ?, ?)').run('asset_backup', 'Emergency fund', 123456, '2026-08-14', 'emergency_fund', new Date().toISOString());
    const backup = createBackupBundle(state.db, state.file);
    const validated = decodeAndValidateBackup(backup.encoded);
    assert.equal(validated.manifest.byteLength, validated.database.length);
    assert.match(validated.manifest.sha256, /^[a-f0-9]{64}$/);
    const tampered = JSON.parse(backup.encoded.toString('utf8'));
    const bytes = Buffer.from(tampered.databaseBase64, 'base64'); bytes[bytes.length - 1] ^= 1; tampered.databaseBase64 = bytes.toString('base64');
    assert.throws(() => decodeAndValidateBackup(Buffer.from(JSON.stringify(tampered))), /checksum/);
  });
});

test('restore replaces current data only after database validation and remains readable after restart', async () => {
  await withDatabase(async state => {
    state.db.prepare('INSERT INTO assets (id,name,amount_minor,as_of_date,category,created_at) VALUES (?, ?, ?, ?, ?, ?)').run('asset_before', 'Before restore', 100, '2026-08-14', 'savings', new Date().toISOString());
    const backup = createBackupBundle(state.db, state.file);
    state.db.prepare('INSERT INTO assets (id,name,amount_minor,as_of_date,category,created_at) VALUES (?, ?, ?, ?, ?, ?)').run('asset_after', 'After backup', 200, '2026-08-14', 'vehicle', new Date().toISOString());
    const validated = decodeAndValidateBackup(backup.encoded);
    state.db = replaceDatabaseSafely(state.db, validated.database, openDatabase, state.file);
    assert.deepEqual(state.db.prepare('SELECT id FROM assets ORDER BY id').all().map(row => row.id), ['asset_before']);
    state.db.close(); state.db = openDatabase(state.file);
    assert.equal(state.db.prepare('SELECT COUNT(*) AS count FROM assets').get().count, 1);
  });
});

test('corrupt SQLite payload never replaces the current database', async () => {
  await withDatabase(async state => {
    state.db.prepare('INSERT INTO assets (id,name,amount_minor,as_of_date,category,created_at) VALUES (?, ?, ?, ?, ?, ?)').run('asset_keep', 'Keep', 100, '2026-08-14', 'savings', new Date().toISOString());
    const corrupt = Buffer.from('not a sqlite database');
    assert.throws(() => decodeAndValidateBackup(Buffer.from(JSON.stringify({ manifest: { format:'jerri-finance-backup', version:1, byteLength:corrupt.length, sha256:'0'.repeat(64) }, databaseBase64:corrupt.toString('base64') }))), /checksum/);
    assert.equal(state.db.prepare('SELECT COUNT(*) AS count FROM assets').get().count, 1);
    assert.equal(fs.existsSync(state.file), true);
  });
});
