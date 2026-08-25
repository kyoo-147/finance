import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const standardFontDataUrl=path.resolve(path.dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/legacy/build/pdf.mjs'))),'../../standard_fonts').replace(/\\/g,'/')+'/';

const MONTHS={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
const cents=v=>{const text=String(v??'').trim(),match=text.match(/^(-)?\$?(\d+|\d{1,3}(?:,\d{3})+)\.(\d{2})$/);if(!match)throw new Error(`Invalid money value: ${String(v)}`);const whole=Number(match[2].replace(/,/g,'')),value=whole*100+Number(match[3]);if(!Number.isSafeInteger(value))throw new Error(`Invalid money value: ${String(v)}`);return match[1]?-value:value};
const realIsoDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const date=new Date(`${value}T00:00:00Z`);return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value};
const isoDate=s=>{const m=String(s).match(/(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{4})/),value=m?`${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2,'0')}`:null;return realIsoDate(value)?value:null};
const monthOf=d=>d.slice(0,7);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');

function csvRows(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}else cell+=ch;}
  if(cell||row.length){row.push(cell);rows.push(row)} return rows;
}

async function pdfRows(bytes){
  const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),disableWorker:true,standardFontDataUrl}).promise; const pages=[];
  for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p);const content=await page.getTextContent();const rows=[];
    for(const item of content.items){if(!item.str?.trim())continue;const y=Math.round(item.transform[5]);let row=rows.find(r=>Math.abs(r.y-y)<=2);if(!row){row={y,cells:[]};rows.push(row)}row.cells.push({x:item.transform[4],text:item.str.trim()});}
    rows.sort((a,b)=>b.y-a.y);for(const row of rows)row.cells.sort((a,b)=>a.x-b.x);pages.push(rows);
  } return pages;
}

function parseStripe(bytes,fileName){
  const rows=csvRows(bytes.toString('utf8').replace(/^﻿/,''));const headers=rows.shift()?.map(header=>header.trim());
  const required=['payout_id','effective_at','currency','gross','fee','net','reporting_category','description','payout_status'];
  if(!headers||!required.every(h=>headers.includes(h)))throw new Error('This is not a supported Stripe Itemised Payouts CSV.');
  const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));const transactions=rows.filter(r=>r.some(value=>value.trim()!=='' )).map((r,rowIndex)=>{try{const rawDate=r[idx.effective_at]||'',date=rawDate.slice(0,10),parsedDate=new Date(`${date}T00:00:00Z`),id=(r[idx.payout_id]||'').trim(),currency=(r[idx.currency]||'').trim().toLowerCase(),status=(r[idx.payout_status]||'').trim().toLowerCase(),reporting=(r[idx.reporting_category]||'').trim().toLowerCase(),gross=cents(r[idx.gross]),fee=cents(r[idx.fee]),amount=cents(r[idx.net]);if(!id||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(parsedDate.valueOf())||parsedDate.toISOString().slice(0,10)!==date||currency!=='aud'||status!=='paid'||reporting!=='payout'||gross-fee!==amount)throw new Error('invalid identity, date, AUD paid-payout status, or gross/fee/net reconciliation');return {sourceKey:`stripe:${id}`,date,month:monthOf(date),description:(r[idx.description]||'Stripe payout').trim()||'Stripe payout',amountCents:amount,kind:'income',scope:'business_pt',category:'Personal Training Income',reviewStatus:'confirmed',profitIncluded:true,note:'',metadata:{payoutId:id,grossCents:gross,feeCents:fee,currency,status}}}catch(error){throw new Error(`Stripe row ${rowIndex+2} is invalid: ${error.message}`)}});
  if(!transactions.length)throw new Error('The Stripe file contains no payout rows.');
  const dates=transactions.map(t=>t.date).sort();return {source:'stripe',period:[dates[0],dates.at(-1)],transactions,summary:`${transactions.length} Stripe payouts · ${(transactions.reduce((sum,t)=>sum+t.amountCents,0)/100).toFixed(2)} AUD`};
}

function rowText(row){return row.cells.map(c=>c.text).join(' ')}
function findMoney(text,label){const r=new RegExp(String.raw`${label}:?\s*\$([\d,]+\.\d{2})`,'i');const m=text.match(r);return m?cents(m[1]):null}

function parsePayslip(pages){
  const text=pages.flat().map(rowText).join('\n');if(!/Pay Period:/i.test(text)||!/Net Pay:/i.test(text))throw new Error('This is not a supported text-based Xero payslip.');
  const period=text.match(/Pay Period:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);const payment=text.match(/Payment Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const toIso=s=>{const [d,m,y]=s.split('/'),value=`${y}-${m}-${d}`;return realIsoDate(value)?value:null};const date=payment?toIso(payment[1]):null;
  const gross=findMoney(text,'Total Earnings');const net=findMoney(text,'Net Pay');const payg=(text.match(/PAYG[^\n]*?\$([\d,]+\.\d{2})/i)||[])[1];const superMatch=text.match(/SGC[^\n]*?\$([\d,]+\.\d{2})/i);
  if(!date||(period&&(!toIso(period[1])||!toIso(period[2])))||gross==null||net==null||!payg||!superMatch)throw new Error('The payslip is missing a real payment period/date, gross pay, PAYG, super, or net pay.');
  const paygCents=cents(payg),superCents=cents(superMatch[1]);if(gross-paygCents!==net)throw new Error('Payslip reconciliation failed: gross minus PAYG does not equal net pay.');
  return {source:'xero',period:[period?toIso(period[1]):date,period?toIso(period[2]):date],summary:`Net pay ${(net/100).toFixed(2)} AUD · gross ${(gross/100).toFixed(2)} AUD`,transactions:[{sourceKey:`xero:${date}:${gross}:${net}`,date,month:monthOf(date),description:'Employment pay · Xero payslip',amountCents:net,kind:'income',scope:'employment',category:'Employment Income',reviewStatus:'confirmed',profitIncluded:false,note:'',metadata:{grossCents:gross,paygCents,superCents,payPeriodStart:period?toIso(period[1]):date,payPeriodEnd:period?toIso(period[2]):date}}]};
}

function parseBank(pages){
  const all=pages.flat();const startText=all.map(rowText).join('\n');if(!/Orange Everyday/i.test(startText)||!/Brought Forward/i.test(startText))throw new Error('This is not a supported ING Orange Everyday statement.');
  const openingMatch=startText.match(/Brought Forward\s*\$([\d,]+\.\d{2})/i);if(!openingMatch)throw new Error('Could not read the statement opening balance.');const opening=cents(openingMatch[1]);
  const tx=[];let previous=null;const occurrences=new Map();
  for(const row of all){const dateCell=row.cells.find(c=>c.x<100&&/^\d{2} [A-Z][a-z]{2} \d{4}$/.test(c.text));
    if(dateCell){const amountCell=row.cells.find(c=>c.x>=330&&c.x<500&&/^-?\$[\d,]+\.\d{2}$/.test(c.text));const balanceCell=row.cells.find(c=>c.x>=500&&/^\$[\d,]+\.\d{2}$/.test(c.text));const desc=row.cells.filter(c=>c.x>=110&&c.x<330).map(c=>c.text).join(' ').trim();if(!amountCell||!balanceCell||!desc)continue;
      const date=isoDate(dateCell.text);if(!date)throw new Error('Bank statement contains an impossible transaction date.');const amount=cents(amountCell.text),balance=cents(balanceCell.text);const identity=`${date}|${desc.toLowerCase()}|${amount}`;const occurrence=(occurrences.get(identity)||0)+1;occurrences.set(identity,occurrence);
      const stripe=/^STRIPE\b/i.test(desc);previous={sourceKey:`ing:${identity}:${occurrence}`,date,month:monthOf(date),description:desc,amountCents:amount,kind:stripe?'transfer':'unknown',scope:'unknown',category:stripe?'Stripe Settlement':'Needs Review',reviewStatus:stripe?'confirmed':'needs_review',profitIncluded:false,note:'',metadata:{balanceCents:balance,statementOpeningCents:opening}};tx.push(previous);
    } else if(previous){const continuation=row.cells.filter(c=>c.x>=110&&c.x<330).map(c=>c.text).join(' ').trim();if(continuation&&!/^(Page|ING is|ABN|GPO Box)/i.test(continuation))previous.description+=` ${continuation}`;}
  }
  if(!tx.length)throw new Error('No bank transactions could be read.');const closing=tx.at(-1).metadata.balanceCents;const movement=tx.reduce((s,t)=>s+t.amountCents,0);if(opening+movement!==closing)throw new Error(`Bank statement reconciliation failed by ${((opening+movement-closing)/100).toFixed(2)} AUD. No data was imported.`);
  return {source:'ing',period:[tx[0].date,tx.at(-1).date],summary:`${tx.length} bank transactions · closing ${(closing/100).toFixed(2)} AUD`,transactions:tx,balances:{openingCents:opening,closingCents:closing,movementCents:movement}};
}

function matchSettlements(files){const stripe=files.flatMap(f=>f.source==='stripe'?f.transactions:[]);const bank=files.flatMap(f=>f.source==='ing'?f.transactions:[]);let matched=0;const used=new Set();for(const s of stripe){const candidate=bank.find(b=>!used.has(b.sourceKey)&&/^STRIPE\b/i.test(b.description)&&b.amountCents===s.amountCents&&Math.abs((new Date(b.date)-new Date(s.date))/86400000)<=3);if(candidate){used.add(candidate.sourceKey);candidate.metadata.matchedStripeKey=s.sourceKey;s.metadata.matchedBankKey=candidate.sourceKey;matched++;}}return matched}
function matchEmployment(files){const payslips=files.flatMap(f=>f.source==='xero'?f.transactions:[]);const bank=files.flatMap(f=>f.source==='ing'?f.transactions:[]);let matched=0;const used=new Set();for(const pay of payslips){const candidate=bank.find(b=>!used.has(b.sourceKey)&&b.amountCents===pay.amountCents&&/PAY|PAYROLL|SALARY|WAGES|WELLNESS|HEALTH/i.test(b.description)&&Math.abs((new Date(b.date)-new Date(pay.date))/86400000)<=3);if(candidate){used.add(candidate.sourceKey);candidate.kind='transfer';candidate.scope='employment';candidate.category='Employment Deposit Match';candidate.reviewStatus='confirmed';candidate.profitIncluded=false;candidate.metadata.matchedXeroKey=pay.sourceKey;pay.metadata.matchedBankKey=candidate.sourceKey;matched++;}}return matched}

export function reconcileMatches(files){
  for(const file of files)for(const transaction of file.transactions){
    delete transaction.metadata?.matchedBankKey;
    if(transaction.metadata?.matchedXeroKey){delete transaction.metadata.matchedXeroKey;transaction.kind='unknown';transaction.scope='unknown';transaction.category='Needs Review';transaction.reviewStatus='needs_review';transaction.profitIncluded=false;}
    delete transaction.metadata?.matchedStripeKey;
  }
  return {matchedSettlements:matchSettlements(files),matchedEmployment:matchEmployment(files)};
}

export async function previewPaths(paths){const files=[];for(const filePath of paths){const bytes=fs.readFileSync(filePath);const fileName=path.basename(filePath);let parsed;if(fileName.toLowerCase().endsWith('.csv'))parsed=parseStripe(bytes,fileName);else if(fileName.toLowerCase().endsWith('.pdf')){const pages=await pdfRows(bytes);const all=pages.flat().map(rowText).join('\n');parsed=/Orange Everyday/i.test(all)?parseBank(pages):parsePayslip(pages);}else throw new Error(`${fileName}: only CSV and text-based PDF files are supported.`);files.push({id:crypto.randomUUID(),fileName,filePath,fileHash:hash(bytes),...parsed});}const {matchedSettlements,matchedEmployment}=reconcileMatches(files);return {id:crypto.randomUUID(),createdAt:new Date().toISOString(),files,matchedSettlements,matchedEmployment,transactionCount:files.reduce((s,f)=>s+f.transactions.length,0),needsReview:files.flatMap(f=>f.transactions).filter(t=>t.reviewStatus==='needs_review').length};}

export const __test={csvRows,parseStripe,parsePayslip,parseBank,matchSettlements,matchEmployment,pdfRows};
