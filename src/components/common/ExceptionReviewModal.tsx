import React, { useState } from 'react';
import type { Category, Transaction, TransactionScope, TransactionType } from '../../types';

interface Props {
  transaction: Transaction;
  categories: Category[];
  onSave: (patch: Partial<Transaction>, remember: boolean) => Promise<void>;
  onClose: () => void;
}

const choices: Array<{ label: string; scope: TransactionScope; type?: TransactionType; categoryId: string; includedInProfit: boolean }> = [
  { label: 'Business Expense', scope: 'business', type: 'expense', categoryId: 'software', includedInProfit: true },
  { label: 'Business Income', scope: 'business', type: 'income', categoryId: 'income-affiliate', includedInProfit: true },
  { label: 'Personal', scope: 'personal', categoryId: 'personal', includedInProfit: false },
  { label: 'Transfer', scope: 'personal', type: 'transfer', categoryId: 'uncategorized', includedInProfit: false },
  { label: 'Investment', scope: 'personal', type: 'transfer', categoryId: 'uncategorized', includedInProfit: false },
  { label: 'Debt Payment', scope: 'personal', type: 'transfer', categoryId: 'uncategorized', includedInProfit: false },
  { label: 'Ignore', scope: 'personal', categoryId: 'uncategorized', includedInProfit: false },
];

export const ExceptionReviewModal: React.FC<Props> = ({ transaction, categories, onSave, onClose }) => {
  const [remember, setRemember] = useState(false);
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
    <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between border-b pb-3"><div><h3 className="font-bold">Review transaction</h3><p className="mt-1 text-xs text-slate-500">{transaction.description} · {transaction.occurredAt}</p></div><button onClick={onClose} aria-label="Close">×</button></div>
      <p className="text-sm font-semibold text-slate-800">What was this?</p>
      <div className="grid grid-cols-2 gap-2">{choices.map((choice) => <button key={choice.label} disabled={saving} onClick={async () => { setSaving(true); setError(''); try { await onSave({ scope: choice.scope, type: choice.type ?? transaction.type, categoryId: categoryId !== transaction.categoryId ? categoryId : choice.categoryId, includedInProfit: choice.includedInProfit, reviewStatus: 'reviewed', notes: choice.label }, remember); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save review.'); setSaving(false); } }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-900 hover:bg-slate-50 disabled:opacity-50">{choice.label}</button>)}</div>
      <label className="block text-xs font-semibold uppercase text-slate-500">Category<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember this choice for future transactions</label>
      {error && <div role="alert" className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      <button onClick={onClose} className="text-xs text-slate-500 hover:underline">Cancel</button>
    </div>
  </div>;
};
