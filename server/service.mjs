import { id, audit } from './db.mjs';
import { parseCsv, moneyToMinor, sha256 } from './csv.mjs';
import { adapterFor } from './adapters.mjs';
import { parsePdfImport } from './pdf-import.mjs';

const now = () => new Date().toISOString();
const fingerprint = (source, row) => sha256(Buffer.from([source,row.occurredOn,row.amountMinor,row.description.toLowerCase(),row.externalId].join('|')));
const one = (db, sql, ...args) => db.prepare(sql).get(...args);

function ruleFor(db, description) { return db.prepare('SELECT * FROM category_rules WHERE ? LIKE \'%\' || pattern || \'%\' ORDER BY priority ASC LIMIT 1').get(description.toLowerCase()); }
function ruleApplied(db, item) {
  const rule = ruleFor(db, item.description);
  if (rule) return { ...item, categoryId:rule.category_id, isBusiness:Boolean(rule.is_business), includeInProfit:Boolean(rule.include_in_profit), reviewStatus:'auto_categorized' };
  if (item.source === 'stripe') return { ...item, categoryId:'income-stripe', isBusiness:true, includeInProfit:true, reviewStatus:'reviewed' };
  // Employment and bank ledgers are deliberately excluded from profit by default. A bank
  // statement mixes personal payments, transfers and Stripe settlements; the user reviews
  // or categorises it before it can affect the business P&L.
  if (item.source === 'xero') return { ...item, categoryId:'income-xero', isBusiness:false, includeInProfit:false, reviewStatus:'reviewed' };
  return { ...item, categoryId:'uncategorized', isBusiness:false, includeInProfit:false, reviewStatus:'needs_review' };
}

export async function stageImport(db, { sourceAccountId, fileName, buffer }) {
  const account = one(db, 'SELECT * FROM accounts WHERE id = ? AND active = 1', sourceAccountId); if (!account) throw Object.assign(new Error('Unknown or inactive source account'), { status:400 });
  const contentHash = sha256(buffer); const previous = one(db, 'SELECT id, status FROM import_jobs WHERE content_hash = ?', contentHash);
  if (previous) throw Object.assign(new Error('This exact file has already been imported.'), { status:409, importId:previous.id });
  const adapter = adapterFor(account.source_type); if (!adapter) throw Object.assign(new Error('No import adapter is available for this source.'),{status:400});
  const isPdf = /\.pdf$/i.test(fileName) || buffer.subarray(0,5).toString('ascii') === '%PDF-';
  if (isPdf && account.source_type === 'stripe') throw Object.assign(new Error('Stripe imports require the Itemised Payouts CSV export.'), {status:400});
  let document;
  if (isPdf) document = await parsePdfImport(account.source_type, buffer);
  else {
    let text;
    try { text = new TextDecoder('utf-8', { fatal:true }).decode(buffer); }
    catch { throw Object.assign(new Error('The CSV is not valid UTF-8 text. Export it again as UTF-8 CSV.'), {status:422}); }
    document = { rows:parseCsv(text), summary:null };
  }
  const rows=document.rows; if (!rows.length) throw Object.assign(new Error('The file contains no importable rows.'), {status:422});
  const jobId=id('import'); db.prepare('INSERT INTO import_jobs (id,source_account_id,file_name,content_hash,status,created_at) VALUES (?, ?, ?, ?, \'staged\', ?)').run(jobId,sourceAccountId,fileName,contentHash,now()); let accepted=0,rejected=0;
  const insert=db.prepare('INSERT INTO import_staging VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const stagedFingerprints = new Set();
  for (const raw of rows) { try { const item=ruleApplied(db,{...adapter(raw),source:account.source_type}); const fp=fingerprint(account.source_type,item); const duplicate=stagedFingerprints.has(fp) || one(db,'SELECT id FROM transactions WHERE source_fingerprint = ?',fp); stagedFingerprints.add(fp); insert.run(id('stage'),jobId,raw.__row,JSON.stringify(raw),item.occurredOn,item.description,item.amountMinor,item.kind,fp,null,duplicate?'duplicate':'ready'); accepted++; } catch(error) { insert.run(id('stage'),jobId,raw.__row,JSON.stringify(raw),null,null,null,null,null,`error: ${error.message}`,'error'); rejected++; } }
  db.prepare('UPDATE import_jobs SET total_rows=?, accepted_rows=?, rejected_rows=? WHERE id=?').run(rows.length,accepted,rejected,jobId);
  if (rejected > 0) {
    db.prepare("UPDATE import_jobs SET status='failed', error_message=? WHERE id=?").run(`${rejected} row(s) could not be parsed. No transactions were committed.`,jobId);
    throw Object.assign(new Error(`Import rejected: ${rejected} row(s) have invalid data. Fix the CSV and try again.`),{status:422,importId:jobId});
  }
  audit(db,'import_job',jobId,'staged',null,{fileName,sourceAccountId,totalRows:rows.length,accepted,rejected});
  const result=getImport(db,jobId); const parsed=result.rows.filter(row=>row.amount_minor !== null);
  const summary={rowCount:rows.length,netMinor:parsed.reduce((sum,row)=>sum+row.amount_minor,0), ...(document.summary ?? {})};
  if(account.source_type === 'stripe') { summary.grossMinor=rows.reduce((sum,row)=>sum + moneyToMinor(row.gross ?? row.Gross ?? row.net ?? row.Net ?? row.Amount ?? row.amount ?? 0),0); summary.feeMinor=summary.grossMinor-summary.netMinor; }
  return {...result,summary};
}

export function getImport(db, idValue) { const job=one(db,'SELECT * FROM import_jobs WHERE id=?',idValue); if(!job) return null; return {...job, rows:db.prepare('SELECT * FROM import_staging WHERE import_job_id=? ORDER BY row_number').all(idValue)}; }

export function commitImport(db, jobId) {
  const job=getImport(db,jobId); if(!job) throw Object.assign(new Error('Import not found'),{status:404}); if(job.status==='committed') return job;
  const source=one(db,'SELECT source_type FROM accounts WHERE id=?',job.source_account_id).source_type; let added=0, duplicates=0; db.exec('BEGIN IMMEDIATE');
  try { const insert=db.prepare("INSERT INTO transactions (id,import_job_id,source_account_id,occurred_on,description,amount_minor,currency,kind,category_id,is_business,include_in_profit,review_status,source_fingerprint,external_id,notes,created_at,updated_at) VALUES (?, ?, ?, ?, ?, ?, 'AUD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for(const stage of job.rows) { if(stage.status !== 'ready') { if(stage.status === 'duplicate') duplicates++; continue; } const raw=JSON.parse(stage.raw_json); const item=ruleApplied(db,{...adapterFor(source)(raw),source}); try { insert.run(id('txn'),job.id,job.source_account_id,item.occurredOn,item.description,item.amountMinor,item.kind,item.categoryId,Number(item.isBusiness),Number(item.includeInProfit),item.reviewStatus,stage.source_fingerprint,item.externalId || null,null,now(),now()); added++; } catch(error) { if(String(error.message).includes('UNIQUE')) { duplicates++; } else throw error; } }
    db.prepare("UPDATE import_jobs SET status='committed', duplicate_rows=?, committed_at=? WHERE id=?").run(duplicates,now(),jobId); audit(db,'import_job',jobId,'committed',{status:'staged'},{added,duplicates}); db.exec('COMMIT'); return getImport(db,jobId);
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

// Scope is an explicit user/source decision, not something inferred from the
// transaction direction. Xero employment income remains personal unless the
// owner deliberately reclassifies it as business income.
export function toTransaction(row) { return { id:row.id, occurredAt:row.occurred_on, description:row.description, sourceAccountId:row.source_account_id, amountMinor:row.amount_minor, currency:row.currency, type:row.kind, scope:row.review_status === 'needs_review' ? 'unknown' : row.is_business ? 'business' : 'personal', categoryId:row.category_id ?? 'uncategorized', includedInProfit:Boolean(row.include_in_profit), reviewStatus:row.review_status, duplicateStatus:'clear', createdAt:row.created_at, updatedAt:row.updated_at }; }
export function toImport(row) { return { id:row.id, sourceAccountId:row.source_account_id, fileName:row.file_name, fileHash:row.content_hash, status:row.status === 'staged' ? 'review_required' : row.status, progress:row.status === 'committed' ? 100 : 75, uploadedAt:row.created_at, rowCount:row.total_rows, duplicateRows:row.duplicate_rows ?? 0, issuesCount:row.rejected_rows }; }
export function toRule(row) { return { id:row.id, priority:row.priority, enabled:true, conditions:[{field:'description',operator:'contains',value:row.pattern}], action:{categoryId:row.category_id,scope:row.is_business ? 'business':'personal',includedInProfit:Boolean(row.include_in_profit)} }; }
export function toAllocation(row) { return { id:row.id,name:row.name,percentageBps:row.percentage_bps,enabled:Boolean(row.active),order:row.sort_order }; }
export function toHolding(row) { return { id:row.id,name:row.name,category:row.category ?? 'etf',units:row.units ?? undefined,currentValueMinor:row.value_minor,monthlyContributionMinor:row.monthly_contribution_minor || undefined,returnMtdMinor:row.return_mtd_minor || undefined,annualReturnMinor:row.annual_return_minor || undefined,asOf:row.as_of_date }; }
function settingsDto(db) { const defaults={importPreferences:{defaultImportSource:'stripe',autoImport:true,deduplicate:true,defaultTaxRateBps:2500},notifications:{weeklySummary:false,lowCashFlowAlert:true,transactionImportIssues:true,profitAllocationUpdated:true,marketing:false},security:{twoFactorEnabled:false,activeSessions:1}}; for(const row of db.prepare('SELECT * FROM settings').all()) try { defaults[row.key]=JSON.parse(row.value); } catch {} return defaults; }
export function bootstrap(db) {
  const all=(s,...args)=>db.prepare(s).all(...args); const first=(s,...args)=>one(db,s,...args);
  const profile=first('SELECT * FROM profiles LIMIT 1');
  let savedProfile={}; try { savedProfile=JSON.parse(first("SELECT value FROM settings WHERE key='profile' LIMIT 1")?.value ?? '{}'); } catch {}
  const defaultProfile={id:profile.id,name:'Jerri Zerafa Finance',type:'Sole trader',abn:'',ownerName:profile.display_name,email:'',currency:profile.currency,financialYearStartMonth:7};
  return { businessProfile:{...defaultProfile,...savedProfile}, connectedAccounts:all('SELECT * FROM accounts ORDER BY name').map(row=>({id:row.id,provider:row.source_type,displayName:row.name,status:row.active?'connected':'disconnected'})), categories:all('SELECT * FROM categories ORDER BY kind,name').map(row=>({id:row.id,name:row.name})), transactions:all('SELECT * FROM transactions ORDER BY occurred_on DESC, created_at DESC').map(toTransaction), importJobs:all('SELECT * FROM import_jobs ORDER BY created_at DESC').map(toImport), categoryRules:all('SELECT * FROM category_rules ORDER BY priority').map(toRule), allocationRules:all('SELECT * FROM allocation_rules ORDER BY sort_order').map(toAllocation), assets:all('SELECT * FROM assets ORDER BY as_of_date DESC').map(row=>({id:row.id,name:row.name,category:row.category ?? 'savings',valueMinor:row.amount_minor,asOf:row.as_of_date,currency:'AUD'})), liabilities:all('SELECT * FROM liabilities ORDER BY as_of_date DESC').map(row=>({id:row.id,name:row.name,category:row.category ?? 'credit_card',balanceMinor:row.amount_minor,asOf:row.as_of_date,currency:'AUD'})), holdings:all('SELECT * FROM holdings ORDER BY as_of_date DESC').map(toHolding), settings:settingsDto(db), activityEvents:all('SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 100').map(row=>({id:row.id,timestamp:row.created_at,title:row.action,description:`${row.entity_type} ${row.entity_id}`,type:row.entity_type === 'import_job'?'import':row.entity_type === 'transaction'?'transaction':row.entity_type === 'allocation_rules'?'allocation':'system'})) };
}

export function dashboard(db) {
  const rows=db.prepare("SELECT substr(occurred_on,1,7) month, kind, SUM(amount_minor) amount_minor FROM transactions WHERE include_in_profit=1 GROUP BY month,kind ORDER BY month").all();
  const totals=db.prepare("SELECT COALESCE(SUM(CASE WHEN kind='income' THEN amount_minor ELSE 0 END),0) income_minor, COALESCE(SUM(CASE WHEN kind='expense' THEN -amount_minor ELSE 0 END),0) expense_minor FROM transactions WHERE include_in_profit=1").get();
  const profit=totals.income_minor-totals.expense_minor;
  const allocation=allocateProfit(profit, db.prepare('SELECT id,name,percentage_bps,sort_order FROM allocation_rules WHERE active=1 ORDER BY sort_order').all());
  return { currency:'AUD', totals:{...totals,profit_minor:profit}, monthly:rows, allocations:allocation, needsReview:db.prepare("SELECT COUNT(*) count FROM transactions WHERE review_status='needs_review'").get().count };
}

// Stable largest-remainder rounding: allocations reconcile exactly to positive
// profit whenever enabled rules total 100%, without inventing or losing cents.
export function allocateProfit(profitMinor, rules) {
  const available=Math.max(0, profitMinor);
  const totalBps=rules.reduce((sum, rule)=>sum + Number(rule.percentage_bps ?? rule.percentageBps ?? 0),0);
  const calculated=rules.map((rule,index)=>{ const bps=Number(rule.percentage_bps ?? rule.percentageBps ?? 0); const numerator=available*bps; return {...rule, amount_minor:Math.floor(numerator/10000), _remainder:numerator%10000, _index:index}; });
  let remaining=totalBps===10000 ? available-calculated.reduce((sum,row)=>sum+row.amount_minor,0) : 0;
  calculated.sort((a,b)=>b._remainder-a._remainder || Number(a.sort_order ?? a.order ?? a._index)-Number(b.sort_order ?? b.order ?? b._index));
  for(let index=0; remaining>0 && calculated.length; index=(index+1)%calculated.length,remaining--) calculated[index].amount_minor++;
  return calculated.sort((a,b)=>a._index-b._index).map(({_remainder,_index,...row})=>row);
}

export function updateTransaction(db, transactionId, input) {
  const before=one(db,'SELECT * FROM transactions WHERE id=?',transactionId); if(!before) throw Object.assign(new Error('Transaction not found'),{status:404});
  const inputSql={...input,category_id:input.categoryId ?? input.category_id,include_in_profit:input.includedInProfit ?? input.include_in_profit,review_status:input.reviewStatus ?? input.review_status,is_business:input.scope === undefined ? input.is_business : input.scope === 'business'};
  const allowed=['category_id','is_business','include_in_profit','review_status','notes','description']; const fields=[]; const values=[];
  for(const key of allowed) if(Object.hasOwn(inputSql,key)) { fields.push(`${key}=?`); values.push(key === 'is_business' || key === 'include_in_profit' ? Number(Boolean(inputSql[key])) : inputSql[key]); }
  if(!fields.length) return toTransaction(before); fields.push('updated_at=?'); values.push(now(),transactionId); db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id=?`).run(...values); const after=one(db,'SELECT * FROM transactions WHERE id=?',transactionId); audit(db,'transaction',transactionId,'updated',before,after); return toTransaction(after);
}
