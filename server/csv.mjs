import { createHash } from 'node:crypto';

/** RFC4180-style CSV parser with quoted fields and CRLF support. */
export function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; continue; }
    if (c === '"') quoted = true; else if (c === ',') { row.push(field); field = ''; } else if (c === '\n') { row.push(field.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row); row=[]; field=''; } else field += c;
  }
  if (quoted) throw new Error('Malformed CSV: a quoted field is not closed.');
  row.push(field.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return [];
  const [headers, ...records] = rows;
  // Excel and Stripe exports can prepend a UTF-8 BOM.  Strip it only from the
  // first header, rather than silently changing data fields.
  const cleanHeaders = headers.map((h, i) => (i === 0 ? h.replace(/^\uFEFF/, '') : h).trim());
  if (!cleanHeaders.some(Boolean)) throw new Error('CSV is missing a header row.');
  return records.map((values, index) => ({ ...Object.fromEntries(cleanHeaders.map((h,i) => [h, (values[i] ?? '').trim()])), __row: index + 2 }));
}
export function moneyToMinor(value) {
  const raw = String(value ?? '').trim().replace(/[$,\s]/g,'').replace(/^\((.*)\)$/,'-$1');
  if (!raw || !/^-?\d+(\.\d{1,2})?$/.test(raw)) throw new Error(`Invalid money value: ${value}`);
  const negative = raw.startsWith('-'); const [whole, fraction=''] = raw.replace('-','').split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0,2)); return negative ? -cents : cents;
}
export function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
