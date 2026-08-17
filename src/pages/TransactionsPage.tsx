import React, { useState } from 'react';
import {
  Search,
  CheckCircle,
  AlertCircle,
  Download,
  X,
  Edit2,
  Tag,
  PlusCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { HeroBanner } from '../components/common/HeroBanner';
import { formatMoney, formatDate } from '../domain/formatters';
import { Transaction, TransactionScope, TransactionType } from '../types';
import { selectCategoryBreakdown } from '../domain/selectors';
import { ManualTransactionModal } from '../components/common/ManualTransactionModal';

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    categories,
    connectedAccounts,
    updateTransaction,
    bulkCategorizeTransactions,
    createCategoryRule,
    deleteManualTransaction,
  } = useFinance();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [ruleModalTxn, setRuleModalTxn] = useState<Transaction | null>(null);
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleScope, setRuleScope] = useState<TransactionScope>('business');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState({ occurredAt: new Date().toISOString().slice(0, 10), description: '', amount: '', type: 'expense' as TransactionType, scope: 'business' as TransactionScope, categoryId: 'software', includedInProfit: true, notes: '' });

  // Filter logic
  const filteredTransactions = transactions.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchMerch = t.merchant && t.merchant.toLowerCase().includes(q);
      if (!matchDesc && !matchMerch) return false;
    }
    if (sourceFilter !== 'all' && t.sourceAccountId !== sourceFilter) return false;
    if (scopeFilter !== 'all' && t.scope !== scopeFilter) return false;
    if (statusFilter !== 'all' && t.reviewStatus !== statusFilter) return false;
    if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;
    return true;
  });

  const categoryBreakdown = selectCategoryBreakdown(transactions, categories);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((t) => t.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const openCreateRuleModal = (txn: Transaction) => {
    setRuleModalTxn(txn);
    setRuleKeyword(txn.merchant || txn.description.split(' ')[0]);
    setRuleCategory(txn.categoryId);
    setRuleScope(txn.scope);
  };

  const handleSaveRule = async () => {
    if (!ruleKeyword.trim() || !ruleCategory) return;
    await createCategoryRule({
      priority: 50,
      enabled: true,
      conditions: [{ field: 'description', operator: 'contains', value: ruleKeyword }],
      action: { categoryId: ruleCategory, scope: ruleScope, includedInProfit: ruleScope === 'business' },
    });
    setRuleModalTxn(null);
  };

  const exportToCsv = () => {
    const headers = ['Date', 'Description', 'Source', 'Amount', 'Type', 'Scope', 'Category', 'Status'];
    const rows = filteredTransactions.map((t) => [
      t.occurredAt,
      `"${t.description.replace(/"/g, '""')}"`,
      t.sourceAccountId,
      (t.amountMinor / 100).toFixed(2),
      t.type,
      t.scope,
      t.categoryId,
      t.reviewStatus,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Transactions_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* De-emphasized Compact Hero Banner */}
      <HeroBanner
        title="Transactions Ledger"
        subtitle="Audited record of all connected statement lines, categorizations, and profit inclusion."
        compact
      >
        <button onClick={() => setManualOpen(true)} className="bg-white hover:bg-slate-50 text-slate-800 font-medium text-[12px] px-3.5 py-1.5 rounded-[8px] border border-slate-300 transition-all cursor-pointer">+ Manual transaction</button>
        <button
          onClick={exportToCsv}
          className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-[12px] px-3.5 py-1.5 rounded-[8px] border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </HeroBanner>

      {/* Unified Compact Filter Toolbar */}
      <div className="bg-white rounded-[16px] border border-slate-200/90 p-3 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Field */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter description or merchant..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Unified Filters */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-700 outline-none"
          >
            <option value="all">All Sources</option>
            {connectedAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-700 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="reviewed">Reviewed</option>
          </select>

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-700 outline-none"
          >
            <option value="all">All Scopes</option>
            <option value="business">Business</option>
            <option value="personal">Personal</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-700 outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Action Strip (Only when items selected) */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white p-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150 text-[12px]">
            <span className="font-semibold text-slate-200">
              {selectedIds.length} items selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  void bulkCategorizeTransactions(selectedIds, 'software', 'business', true).catch(() => undefined);
                  setSelectedIds([]);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium px-3 py-1 rounded cursor-pointer"
              >
                Set Software
              </button>
              <button
                onClick={() => {
                  void bulkCategorizeTransactions(selectedIds, 'education', 'business', true).catch(() => undefined);
                  setSelectedIds([]);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium px-3 py-1 rounded cursor-pointer"
              >
                Set Education
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-white text-[11px] px-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Ledger Table & Sidebar Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Table Hero (9 cols) */}
        <div className="xl:col-span-9 bg-white rounded-[16px] border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span className="text-[13px] font-bold text-slate-900">
              Showing {filteredTransactions.length} Entries
            </span>
            <span className="text-[11.5px] text-slate-400">Click entry to inspect details</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900"
                    />
                  </th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Scope</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredTransactions.map((txn) => {
                  const catName = categories.find((c) => c.id === txn.categoryId)?.name || 'Uncategorized';
                  const isSelected = selectedIds.includes(txn.id);

                  return (
                    <tr
                      key={txn.id}
                      className={`group hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-slate-100/50' : ''
                      }`}
                    >
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(txn.id)}
                          className="rounded border-slate-300 text-slate-900"
                        />
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11.5px] font-medium whitespace-nowrap">
                        {formatDate(txn.occurredAt)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 max-w-[220px] truncate" title={txn.description}>
                          {txn.description}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {txn.merchant ? txn.merchant : txn.sourceAccountId}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold tabular-nums whitespace-nowrap">
                        <span className={txn.type === 'income' ? 'text-emerald-700' : 'text-slate-900'}>
                          {txn.type === 'income' ? '+' : ''}
                          {formatMoney(txn.amountMinor)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {txn.scope === 'business' ? 'Business' : txn.scope === 'personal' ? 'Personal' : 'Unknown — review required'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          onClick={() => setEditingTxn(txn)}
                          className="text-[12px] font-medium text-slate-800 hover:underline cursor-pointer max-w-[140px] truncate block"
                          title="Click to edit category"
                        >
                          {catName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded ${
                            txn.reviewStatus === 'reviewed'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {txn.reviewStatus === 'reviewed' ? 'Reviewed' : 'Review'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openCreateRuleModal(txn)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                            title="Add Rule"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingTxn(txn)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {txn.isManual && <button onClick={() => { if (window.confirm('Delete this manual transaction?')) void deleteManualTransaction(txn.id); }} className="p-1 text-slate-400 hover:text-rose-700 rounded cursor-pointer" title="Delete manual transaction">×</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: Categorization Rules & Breakdown (3 cols) */}
        <div className="xl:col-span-3 space-y-5">
          {/* Categorization Rules Card */}
          <div className="bg-white rounded-[16px] border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-[14px] text-slate-900 pb-2 border-b border-slate-100">
              Categorization Rules
            </h3>
            <p className="text-[11.5px] text-slate-500 leading-relaxed">
              Automate row matching rules to assign incoming bank statements directly into tax buckets.
            </p>
            <button
              onClick={() => openCreateRuleModal(transactions[0])}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold py-2 rounded-lg cursor-pointer transition-all shadow-xs"
            >
              + Create Categorization Rule
            </button>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-[16px] border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-[14px] text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Expense Mix</span>
              <Tag className="w-3.5 h-3.5 text-slate-400" />
            </h3>
            <div className="space-y-2.5 text-[12px]">
              {categoryBreakdown.map((item) => (
                <div key={item.categoryId} className="space-y-1">
                  <div className="flex justify-between text-slate-800 font-medium">
                    <span className="truncate max-w-[120px]">{item.name}</span>
                    <span className="font-bold tabular-nums">{formatMoney(item.amountMinor)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-800 h-full rounded-full"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {manualOpen && <ManualTransactionModal onClose={() => setManualOpen(false)} />}

      {/* Edit Modal */}
      {editingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-[15px] text-slate-900">Edit Ledger Entry</h3>
              <button onClick={() => setEditingTxn(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {editingTxn.isManual && <div className="grid grid-cols-3 gap-3"><label className="text-[11px] font-medium text-slate-500 uppercase">Date<input type="date" value={editingTxn.occurredAt} onChange={(e) => setEditingTxn({ ...editingTxn, occurredAt: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-900 mt-1" /></label><label className="text-[11px] font-medium text-slate-500 uppercase">Amount<input type="number" step="0.01" value={(Math.abs(editingTxn.amountMinor) / 100).toFixed(2)} onChange={(e) => setEditingTxn({ ...editingTxn, amountMinor: Math.round(Number(e.target.value) * 100) * (editingTxn.type === 'expense' ? -1 : 1) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-900 mt-1" /></label><label className="text-[11px] font-medium text-slate-500 uppercase">Type<select value={editingTxn.type} onChange={(e) => setEditingTxn({ ...editingTxn, type: e.target.value as TransactionType })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-900 mt-1"><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></select></label></div>}
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase">Description</label>
                <input
                  type="text"
                  value={editingTxn.description}
                  onChange={(e) => setEditingTxn({ ...editingTxn, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-900 mt-1 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase">Scope</label>
                  <select
                    value={editingTxn.scope}
                    onChange={(e) => setEditingTxn({ ...editingTxn, scope: e.target.value as TransactionScope })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12.5px] text-slate-900 mt-1 outline-none"
                  >
                    <option value="unknown">Unknown — review required</option>
                    <option value="business">Business</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-500 uppercase">Category</label>
                  <select
                    value={editingTxn.categoryId}
                    onChange={(e) => setEditingTxn({ ...editingTxn, categoryId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12.5px] text-slate-900 mt-1 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={editingTxn.includedInProfit} disabled={editingTxn.scope !== 'business'} onChange={(e) => setEditingTxn({ ...editingTxn, includedInProfit: e.target.checked })} /> Include in business profit</label>
            {editingTxn.isManual && <label className="block text-[11px] font-medium text-slate-500 uppercase">Notes<textarea value={editingTxn.notes ?? ''} onChange={(e) => setEditingTxn({ ...editingTxn, notes: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm" rows={2} /></label>}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingTxn(null)}
                className="px-3.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try { await updateTransaction(editingTxn.id, { ...editingTxn, reviewStatus: editingTxn.scope === 'unknown' ? 'needs_review' : 'reviewed', includedInProfit: editingTxn.scope === 'business' && editingTxn.includedInProfit }); setEditingTxn(null); } catch { /* global error banner is shown by the context */ }
                }}
                className="px-3.5 py-1.5 text-[12px] font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {ruleModalTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-[15px] text-slate-900">New Categorization Rule</h3>
              <button onClick={() => setRuleModalTxn(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase">If description contains</label>
                <input
                  type="text"
                  value={ruleKeyword}
                  onChange={(e) => setRuleKeyword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] text-slate-900 mt-1 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase">Set Category</label>
                <select
                  value={ruleCategory}
                  onChange={(e) => setRuleCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12.5px] text-slate-900 mt-1 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setRuleModalTxn(null)}
                className="px-3.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                className="px-3.5 py-1.5 text-[12px] font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
