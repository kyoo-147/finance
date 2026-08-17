import React, { useState } from 'react';
import { Search, X, Receipt, CreditCard, Tag } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatMoney, formatDate } from '../../domain/formatters';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, transactions, connectedAccounts, categories, setActiveTab } = useFinance();
  const [query, setQuery] = useState('');

  if (!isSearchOpen) return null;

  const filteredTxns = query.trim()
    ? transactions.filter(
        (t) =>
          t.description.toLowerCase().includes(query.toLowerCase()) ||
          (t.merchant && t.merchant.toLowerCase().includes(query.toLowerCase()))
      )
    : transactions.slice(0, 5);

  const filteredCategories = query.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const filteredAccounts = query.trim()
    ? connectedAccounts.filter((a) => a.displayName.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-[#08123D]/50 backdrop-blur-xs">
      <div className="bg-white rounded-[16px] border border-[#E7EBF3] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-[#E7EBF3] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#7E8AA8]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, merchants, categories or accounts... (Press Esc to close)"
            className="flex-1 text-[14px] text-[#08123D] placeholder-[#7E8AA8] outline-none"
            autoFocus
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1 text-[#7E8AA8] hover:bg-[#F5F7FB] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results List */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
          {/* Transactions section */}
          <div>
            <div className="text-[10px] font-bold text-[#7E8AA8] uppercase px-2 mb-1 tracking-wider flex items-center gap-1">
              <Receipt className="w-3 h-3" /> Transactions
            </div>
            {filteredTxns.length === 0 ? (
              <div className="text-[12px] text-[#7E8AA8] px-2 py-1">No matching transactions</div>
            ) : (
              <div className="space-y-1">
                {filteredTxns.slice(0, 6).map((txn) => (
                  <div
                    key={txn.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setActiveTab('transactions');
                    }}
                    className="flex items-center justify-between p-2 rounded-[8px] hover:bg-[#F5F7FB] cursor-pointer text-[12px]"
                  >
                    <div>
                      <div className="font-semibold text-[#08123D]">{txn.description}</div>
                      <div className="text-[10px] text-[#7E8AA8]">
                        {formatDate(txn.occurredAt)} • {txn.scope}
                      </div>
                    </div>
                    <div
                      className={`font-mono font-bold ${
                        txn.type === 'income' ? 'text-[#16A35A]' : 'text-[#08123D]'
                      }`}
                    >
                      {txn.type === 'income' ? '+' : ''}
                      {formatMoney(txn.amountMinor)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories section */}
          {filteredCategories.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#7E8AA8] uppercase px-2 mb-1 tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3" /> Categories
              </div>
              <div className="flex flex-wrap gap-1.5 px-2">
                {filteredCategories.map((c) => (
                  <span
                    key={c.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setActiveTab('transactions');
                    }}
                    className="text-[11px] font-medium bg-[#EEF3FF] text-[#1547F5] px-2.5 py-1 rounded-full cursor-pointer hover:bg-[#1547F5] hover:text-white transition-all"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Connected Accounts section */}
          {filteredAccounts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#7E8AA8] uppercase px-2 mb-1 tracking-wider flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Accounts
              </div>
              <div className="space-y-1">
                {filteredAccounts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setActiveTab('settings');
                    }}
                    className="flex items-center justify-between p-2 rounded-[8px] hover:bg-[#F5F7FB] cursor-pointer text-[12px]"
                  >
                    <span className="font-medium text-[#08123D]">{a.displayName}</span>
                    <span className="text-[10px] text-[#16A35A] font-semibold bg-[#E9F8F0] px-2 py-0.5 rounded-full">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
