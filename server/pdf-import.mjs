import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { moneyToMinor, sha256 } from './csv.mjs';

const asError = (message, status = 422) => Object.assign(new Error(message), { status });
const amountText = /^-?\$[\d,]+\.\d{2}$/;

function isoDate(value) {
  const match = String(value).match(/(\d{2})\/(\d{2})\/(\d{4})|(\d{2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!match) throw asError(`Could not read a date from “${value}”.`);
  if (match[1]) return `${match[3]}-${match[2]}-${match[1]}`;
  const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const month = months[match[5]];
  if (!month) throw asError(`Unsupported statement month in “${value}”.`);
  return `${match[6]}-${month}-${match[4]}`;
}

async function loadPdf(buffer) {
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw asError('The uploaded file is not a valid PDF.', 400);
  try {
    return await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  } catch {
    throw asError('This PDF could not be read. Upload the original text-based Xero or ING document, not a screenshot or password-protected copy.');
  }
}

async function textByPage(pdf) {
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const content = await (await pdf.getPage(pageNo)).getTextContent();
    pages.push(content.items.map(item => ({ text: item.str, x: item.transform[4], y: item.transform[5] })));
  }
  return pages;
}

function allText(pages) { return pages.flat().map(item => item.text).join(' ').replace(/\s+/g, ' ').trim(); }

function readPayslip(text) {
  if (!/Pay\s*Period/i.test(text) || !/Net\s*Pay/i.test(text) || !/PAYG/i.test(text)) throw asError('This is not a recognisable Xero payslip.');
  const period = text.match(/Pay\s*Period:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})\s*Payment\s*Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const gross = text.match(/Total\s*Earnings:\s*\$([\d,]+\.\d{2})/i);
  const net = text.match(/Net\s*Pay:\s*\$([\d,]+\.\d{2})/i);
  const paygSegment = text.slice(text.search(/\bTAX\b/i), text.search(/\bSUPERANNUATION\b/i));
  const payg = paygSegment.match(/\$([\d,]+\.\d{2})/);
  const superStart = text.search(/\bSUPERANNUATION\b/i);
  const superSegment = text.slice(superStart, text.toUpperCase().indexOf('LEAVE', superStart));
  const superAmount = superSegment.match(/\$([\d,]+\.\d{2})/);
  if (!period || !gross || !net || !payg || !superAmount) throw asError('The Xero payslip is missing its pay period, earnings, PAYG, superannuation or net-pay value.');
  const grossMinor = moneyToMinor(gross[1]); const netMinor = moneyToMinor(net[1]); const paygMinor = moneyToMinor(payg[1]); const superMinor = moneyToMinor(superAmount[1]);
  if (grossMinor - paygMinor !== netMinor) throw asError('The payslip totals do not reconcile: gross pay minus PAYG must equal net pay.');
  return {
    rows: [{ __row: 1, 'Payment Date': isoDate(period[3]), 'Net Pay': net[1], 'Payslip ID': `xero:${isoDate(period[3])}:${netMinor}`, 'Description': `Xero payslip ${period[1]} to ${period[2]}` }],
    summary: { rowCount: 1, grossPayMinor: grossMinor, paygWithheldMinor: paygMinor, superannuationMinor: superMinor, netMinor, payPeriodStart: isoDate(period[1]), payPeriodEnd: isoDate(period[2]), paymentDate: isoDate(period[3]) }
  };
}

function makeLines(items) {
  const lines = [];
  for (const item of items) {
    if (!item.text.trim()) continue;
    let line = lines.find(candidate => Math.abs(candidate.y - item.y) < 0.6);
    if (!line) { line = { y: item.y, items: [] }; lines.push(line); }
    line.items.push(item);
  }
  return lines.sort((a, b) => b.y - a.y).map(line => ({ ...line, items: line.items.sort((a, b) => a.x - b.x) }));
}

function readStatement(pages, contentHash) {
  const text = allText(pages);
  const range = text.match(/Statement\s*Start\s*Date\s*(\d{2}\s+[A-Za-z]{3}\s+\d{4}).*?Statement\s*End\s*Date\s*(\d{2}\s+[A-Za-z]{3}\s+\d{4})/i);
  if (!range || !/Orange Everyday/i.test(text)) throw asError('This is not a recognisable ING Orange Everyday statement.');
  const records = [];
  let priorBalance = null;
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    for (const line of makeLines(pages[pageIndex])) {
      const dateItem = line.items.find(item => item.x < 100 && /^\d{2}\s+[A-Za-z]{3}\s+\d{4}$/.test(item.text.trim()));
      if (!dateItem) continue;
      const amountItem = line.items.find(item => item.x >= 330 && item.x < 500 && amountText.test(item.text.trim()));
      const balanceItem = line.items.find(item => item.x >= 500 && amountText.test(item.text.trim()));
      const description = line.items.filter(item => item.x >= 100 && item.x < 330).map(item => item.text.trim()).filter(Boolean).join(' ').trim();
      if (!amountItem || !balanceItem || !description) throw asError(`ING statement row on page ${pageIndex + 1} is incomplete; no data was imported.`);
      const amountMinor = moneyToMinor(amountItem.text);
      const balanceMinor = moneyToMinor(balanceItem.text);
      if (priorBalance !== null && priorBalance + amountMinor !== balanceMinor) throw asError(`ING statement did not reconcile at ${dateItem.text} (${description}); no data was imported.`);
      priorBalance = balanceMinor;
      const occurredOn = isoDate(dateItem.text);
      records.push({ __row: records.length + 1, Date: occurredOn, Description: description, Amount: amountItem.text, 'Transaction ID': `ing:${sha256(Buffer.from(`${occurredOn}|${description}|${amountItem.text}`)).slice(0, 24)}` });
    }
  }
  if (!records.length || priorBalance === null) throw asError('No transaction rows were found in this ING statement.');
  // The first transaction's displayed balance minus its movement gives the opening balance.
  // Store balances independently so the formula remains explicit and testable.
  const firstLine = makeLines(pages[0]).find(line => line.items.some(item => item.x < 100 && /^\d{2}\s+[A-Za-z]{3}\s+\d{4}$/.test(item.text.trim())));
  const firstAmount = firstLine.items.find(item => item.x >= 330 && item.x < 500 && amountText.test(item.text.trim()));
  const firstBalance = firstLine.items.find(item => item.x >= 500 && amountText.test(item.text.trim()));
  const opening = moneyToMinor(firstBalance.text) - moneyToMinor(firstAmount.text);
  const depositsMinor = records.reduce((sum, row) => sum + Math.max(0, moneyToMinor(row.Amount)), 0);
  const withdrawalsMinor = records.reduce((sum, row) => sum + Math.max(0, -moneyToMinor(row.Amount)), 0);
  if (opening + depositsMinor - withdrawalsMinor !== priorBalance) throw asError('ING statement totals did not reconcile; no data was imported.');
  return { rows: records, summary: { rowCount: records.length, openingBalanceMinor: opening, closingBalanceMinor: priorBalance, depositsMinor, withdrawalsMinor, netCashMovementMinor: priorBalance - opening, statementStart: isoDate(range[1]), statementEnd: isoDate(range[2]) } };
}

export async function parsePdfImport(source, buffer) {
  const pdf = await loadPdf(buffer);
  const pages = await textByPage(pdf);
  const text = allText(pages);
  if (source === 'xero') return readPayslip(text);
  if (source === 'bank') return readStatement(pages, sha256(buffer));
  throw asError('PDF imports are supported only for Xero payslips and ING bank statements.', 400);
}
