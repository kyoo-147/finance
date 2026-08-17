import { moneyToMinor } from './csv.mjs';
const clean = value => String(value ?? '').trim();
const valueOf = (r, names) => names.map(n => r[n]).find(v => v !== undefined && v !== '');
const date = v => {
  const s=clean(v); const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  // Avoid Date's rollover behaviour (for example 2026-02-30 becoming March).
  if (iso) { const d=new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`); if (d.getUTCFullYear()!==Number(iso[1]) || d.getUTCMonth()+1!==Number(iso[2]) || d.getUTCDate()!==Number(iso[3])) throw new Error(`Invalid date: ${s}`); return `${iso[1]}-${iso[2]}-${iso[3]}`; }
  const d=new Date(s); if(Number.isNaN(d.valueOf())) throw new Error(`Invalid date: ${s}`); return d.toISOString().slice(0,10);
};
function assertAud(row) { const currency=valueOf(row,['currency','Currency','Settlement currency']); if (currency !== undefined && clean(currency).toUpperCase() !== 'AUD') throw new Error(`Unsupported currency: ${currency}. This local portal is configured for AUD only.`); }
export function adaptStripe(row) {
  assertAud(row);
  const gross = valueOf(row,['gross','Gross','Amount','amount']); const net=valueOf(row,['net','Net','Net amount']);
  const amount = net ?? gross; if (amount === undefined) throw new Error('Stripe row is missing net/gross amount');
  // A Stripe payout is only trustworthy when every supplied monetary field parses.
  // Validate gross/fee too; otherwise an invalid report could silently distort totals.
  const grossMinor = gross === undefined ? undefined : moneyToMinor(gross);
  const fee = valueOf(row,['fee','Fee']); if (fee !== undefined) moneyToMinor(fee);
  const netMinor = moneyToMinor(amount);
  if (grossMinor !== undefined && fee !== undefined) {
    const feeMinor=moneyToMinor(fee);
    // Stripe reports fees either as a positive deduction or as a negative value,
    // depending on export type. Both are valid; anything else is unsafe.
    if (netMinor !== grossMinor - Math.abs(feeMinor)) throw new Error('Stripe row totals do not reconcile: gross minus fee must equal net.');
  }
  // Stripe's "Itemised payouts" export uses `effective_at` and `payout_id`.
  // Keep the alternate names as Stripe offers more than one report layout.
  // Negative payout adjustments are reversals, not revenue. Preserve the amount
  // and make them an expense so profit cannot be overstated.
  return { occurredOn: date(valueOf(row,['effective_at','arrival_date','Arrival date','created','Created','Date','date'])), description: clean(valueOf(row,['description','Description','type','Type']) ?? 'Stripe payout'), amountMinor: netMinor, kind:netMinor < 0 ? 'expense' : 'income', externalId: clean(valueOf(row,['payout_id','id','ID','Payout ID'])), raw:row };
}
export function adaptBank(row) {
  assertAud(row);
  const debit=valueOf(row,['Debit','debit','Withdrawal','withdrawal']); const credit=valueOf(row,['Credit','credit','Deposit','deposit']); const signed=valueOf(row,['Amount','amount','Transaction Amount']);
  const amount = signed !== undefined ? moneyToMinor(signed) : credit !== undefined ? moneyToMinor(credit) : -moneyToMinor(debit);
  return { occurredOn: date(valueOf(row,['Date','date','Transaction Date'])), description:clean(valueOf(row,['Description','description','Narration','Details']) ?? 'Bank transaction'), amountMinor:amount, kind:amount >=0?'income':'expense', externalId:clean(valueOf(row,['Transaction ID','Reference','reference'])), raw:row };
}
export function adaptXero(row) {
  assertAud(row);
  return { occurredOn:date(valueOf(row,['Payment Date','payment_date','Date','date'])), description:'Xero employment pay', amountMinor:moneyToMinor(valueOf(row,['Net Pay','net_pay','Net','net'])), kind:'income', externalId:clean(valueOf(row,['Payslip ID','id'])), raw:row };
}
export function adapterFor(source) { return source === 'stripe' ? adaptStripe : source === 'xero' ? adaptXero : source === 'bank' ? adaptBank : null; }
