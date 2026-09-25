import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DocumentVault} from '../electron/documents.mjs';

const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'jerri-documents-'));

test('document vault stores CSV data independently of the source path',t=>{
  const root=temporary();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const source=path.join(root,'statement.csv');fs.writeFileSync(source,'Date,Amount\n2026-09-01,42.00\n');
  const vault=new DocumentVault(path.join(root,'data')),stored=vault.ingest(source,{source:'finance-import'});
  fs.unlinkSync(source);
  const reopened=new DocumentVault(path.join(root,'data')),result=reopened.read(stored.id);
  assert.equal(result.metadata.kind,'table');
  assert.equal(result.data.toString('utf8'),'Date,Amount\n2026-09-01,42.00\n');
});

test('document vault accepts a PDF whose filename contains repeated extensions',t=>{
  const root=temporary();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const source=path.join(root,'report.pdf.pdf.pdf');fs.writeFileSync(source,'%PDF-1.7\n');
  const stored=new DocumentVault(path.join(root,'data')).ingest(source);
  assert.equal(stored.name,'report.pdf.pdf.pdf');
  assert.equal(stored.mime,'application/pdf');
  assert.equal(stored.kind,'pdf');
});

test('document vault rejects unsupported executable files',t=>{
  const root=temporary();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const source=path.join(root,'unsafe.exe');fs.writeFileSync(source,'MZ');
  assert.throws(()=>new DocumentVault(path.join(root,'data')).ingest(source),/not a supported document type/);
});

test('document recovery refuses a file that does not match the original import hash',t=>{
  const root=temporary();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const original=path.join(root,'statement.csv'),replacement=path.join(root,'replacement.csv');
  fs.writeFileSync(original,'Date,Amount\n2026-09-01,42.00\n');
  fs.writeFileSync(replacement,'Date,Amount\n2026-09-01,999.00\n');
  const expected=new DocumentVault(path.join(root,'first')).ingest(original).id;
  assert.throws(()=>new DocumentVault(path.join(root,'second')).ingest(replacement,{id:expected}),/does not match the document originally imported/);
});

