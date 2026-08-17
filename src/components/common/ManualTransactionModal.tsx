import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import type { TransactionScope, TransactionType } from '../../types';

export const ManualTransactionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { categories, createManualTransaction } = useFinance();
  const [draft, setDraft] = useState({
    occurredAt: new Date().toISOString().slice(0, 10), description: '', amount: '',
    type: 'expense' as TransactionType, scope: 'business' as TransactionScope,
    categoryId: 'software', includedInProfit: true, notes: '', error: '', saving: false,
  });
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
    <div className="bg-white rounded-[16px] border border-slate-200 p-6 max-w-lg w-full shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b pb-3"><h3 className="font-bold">Add Manual Transaction</h3><button onClick={onClose} aria-label="Close">×</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold uppercase text-slate-500">Date<input type="date" value={draft.occurredAt} onChange={(e) => set({ occurredAt: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold uppercase text-slate-500">Amount (AUD)<input type="number" step="0.01" min="0" value={draft.amount} onChange={(e) => set({ amount: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold uppercase text-slate-500 sm:col-span-2">Description / source<input value={draft.description} onChange={(e) => set({ description: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold uppercase text-slate-500">Type<select value={draft.type} onChange={(e) => set({ type: e.target.value as TransactionType })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></select></label>
        <label className="text-xs font-semibold uppercase text-slate-500">Scope<select value={draft.scope} onChange={(e) => set({ scope: e.target.value as TransactionScope, includedInProfit: e.target.value === 'business' })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"><option value="business">Business</option><option value="personal">Personal</option></select></label>
        <label className="text-xs font-semibold uppercase text-slate-500 sm:col-span-2">Category<select value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.includedInProfit} disabled={draft.scope !== 'business'} onChange={(e) => set({ includedInProfit: e.target.checked })} /> Include in business profit</label>
        <label className="text-xs font-semibold uppercase text-slate-500 sm:col-span-2">Notes<textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={2} /></label>
      </div>
      {draft.error && <div role="alert" className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{draft.error}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-3 py-2 text-sm">Cancel</button><button disabled={draft.saving} onClick={async () => { set({ saving: true, error: '' }); try { await createManualTransaction({ occurredAt: draft.occurredAt, description: draft.description, amountMinor: Math.round(Number(draft.amount) * 100), type: draft.type, scope: draft.scope, categoryId: draft.categoryId, includedInProfit: draft.scope === 'business' && draft.includedInProfit, reviewStatus: 'reviewed', duplicateStatus: 'clear', notes: draft.notes }); onClose(); } catch (error) { set({ error: error instanceof Error ? error.message : 'Unable to save transaction.', saving: false }); } }} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{draft.saving ? 'Saving…' : 'Save transaction'}</button></div>
    </div>
  </div>;
};
