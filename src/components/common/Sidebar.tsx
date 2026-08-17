import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Receipt,
  PieChart,
  TrendingUp,
  Wallet,
  LineChart,
  Settings,
  Sparkles,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  Hexagon,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ActiveTab } from '../../types';
import { selectNeedsReviewCount } from '../../domain/selectors';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, transactions, importJobs, businessProfile } = useFinance();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const needsReviewCount = selectNeedsReviewCount(transactions);
  const activeImportsCount = importJobs.filter(
    (j) => j.status !== 'committed' && j.status !== 'failed'
  ).length;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    { id: 'imports', label: 'Imports', icon: <FileSpreadsheet className="w-4.5 h-4.5" />, badge: activeImportsCount },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4.5 h-4.5" />, badge: needsReviewCount },
    { id: 'allocation', label: 'Allocation', icon: <PieChart className="w-4.5 h-4.5" /> },
    { id: 'cash-flow', label: 'Cash Flow', icon: <TrendingUp className="w-4.5 h-4.5" /> },
    { id: 'net-worth', label: 'Net Worth', icon: <Wallet className="w-4.5 h-4.5" /> },
    { id: 'investments', label: 'Investments', icon: <LineChart className="w-4.5 h-4.5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4.5 h-4.5" /> },
  ];

  return (
    <aside
      className={`bg-white border-r border-[#E7EBF3] flex flex-col h-screen sticky top-0 flex-shrink-0 z-30 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[68px]' : 'w-[230px]'
      }`}
    >
      {/* Brand Header & Collapse Toggle */}
      <div className="p-4 border-b border-[#E7EBF3]/60 flex items-center justify-between min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-tr from-[#1547F5] to-[#2B60FF] flex-shrink-0 flex items-center justify-center text-white shadow-xs">
            <Hexagon className="w-5 h-5 fill-white/20 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 overflow-hidden">
              <div className="font-extrabold text-[15px] text-[#08123D] leading-tight truncate">
                Jerri Finance
              </div>
              <div className="text-[11px] text-[#7E8AA8] font-medium truncate">
                Portal
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-[8px] text-[#7E8AA8] hover:text-[#1547F5] hover:bg-[#F4F7FF] transition-all cursor-pointer flex-shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-[10px] text-[13.5px] font-medium transition-all cursor-pointer relative ${
                isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-between px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-[#EEF3FF] text-[#1547F5] font-bold shadow-2xs border-l-3 border-[#1547F5]'
                  : 'text-[#4C5B82] hover:bg-[#F5F8FC] hover:text-[#08123D]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-[#1547F5]' : 'text-[#7E8AA8]'}>{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {/* Badge for Expanded Mode */}
              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    item.id === 'transactions'
                      ? 'bg-[#FFF6E5] text-[#D97706]'
                      : 'bg-[#EEF3FF] text-[#1547F5]'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Indicator Dot for Collapsed Mode */}
              {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                    item.id === 'transactions' ? 'bg-[#D97706]' : 'bg-[#1547F5]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Pro Tip Card (Matching Original Design Screenshot) */}
      {!isCollapsed && (
        <div className="p-3.5 m-3 rounded-[14px] bg-[#F4F7FF] border border-[#E2E8F0] space-y-2">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#1547F5]">
            <Sparkles className="w-3.5 h-3.5 text-[#1547F5]" />
            <span>Pro tip</span>
          </div>
          <p className="text-[11px] text-[#5E6A8A] leading-relaxed font-normal">
            Upload your exported CSV reports to keep your records current.
          </p>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-[12px] font-semibold text-[#1547F5] hover:text-[#0B2FD7] flex items-center gap-1 cursor-pointer group pt-0.5"
          >
            <span>Add account</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {/* User Info Bar at Bottom */}
      <div className="p-3 border-t border-[#E7EBF3] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#EEF3FF] border border-[#1547F5]/20 text-[#1547F5] font-bold text-xs flex-shrink-0 flex items-center justify-center">
          {businessProfile.ownerName.charAt(0)}
        </div>
        {!isCollapsed && (
          <div className="truncate flex-1 min-w-0">
            <div className="text-[12px] font-bold text-[#08123D] leading-tight truncate">
              {businessProfile.ownerName}
            </div>
            <div className="text-[10px] text-[#7E8AA8] truncate">Business Owner</div>
          </div>
        )}
      </div>
    </aside>
  );
};
