import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Search,
  Bell,
  Sparkles,
  LayoutDashboard,
  FileSpreadsheet,
  Receipt,
  PieChart,
  TrendingUp,
  Wallet,
  LineChart,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ActiveTab } from '../../types';
import { selectNeedsReviewCount } from '../../domain/selectors';

export const MobileHeader: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const {
    activeTab,
    setActiveTab,
    transactions,
    importJobs,
    businessProfile,
    setIsSearchOpen,
    setIsNotificationsOpen,
    setIsAiAssistantOpen,
  } = useFinance();

  const needsReviewCount = selectNeedsReviewCount(transactions);
  const activeImportsCount = importJobs.filter(
    (j) => j.status !== 'committed' && j.status !== 'failed'
  ).length;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'imports', label: 'Imports', icon: <FileSpreadsheet className="w-4 h-4" />, badge: activeImportsCount },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" />, badge: needsReviewCount },
    { id: 'allocation', label: 'Allocation', icon: <PieChart className="w-4 h-4" /> },
    { id: 'cash-flow', label: 'Cash Flow', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'net-worth', label: 'Net Worth', icon: <Wallet className="w-4 h-4" /> },
    { id: 'investments', label: 'Investments', icon: <LineChart className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const currentTabLabel = navItems.find((n) => n.id === activeTab)?.label || 'Dashboard';

  return (
    <>
      <header
        className={`lg:hidden px-4 sticky top-0 z-40 flex items-center justify-between transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'py-2 bg-white/85 backdrop-blur-md border-b border-slate-200/90 shadow-xs'
            : 'py-3 bg-white/95 backdrop-blur-xs border-b border-[#E7EBF3] shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[#F5F7FB] text-[#08123D] cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-[#1547F5] flex items-center justify-center text-white font-bold text-xs">
              J
            </div>
            <span className="font-bold text-[15px] text-[#08123D]">{currentTabLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsAiAssistantOpen(true)}
            className="flex items-center gap-1 bg-[#1547F5] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-[8px] cursor-pointer"
            aria-label="Open AI Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI</span>
          </button>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-lg hover:bg-[#F5F7FB] text-[#4C5B82] cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 rounded-lg hover:bg-[#F5F7FB] text-[#4C5B82] relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF3D55]" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#08123D]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative bg-white w-4/5 max-w-xs h-full flex flex-col p-4 z-10 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7EBF3] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-[#1547F5] flex items-center justify-center text-white font-bold text-sm">
                  J
                </div>
                <div>
                  <div className="font-bold text-[14px] text-[#08123D] flex items-center gap-1">
                    Jerri Finance
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1547F5]" />
                  </div>
                  <div className="text-[10px] text-[#7E8AA8]">{businessProfile.name}</div>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-[#7E8AA8] hover:bg-[#F5F7FB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-[13px] font-medium cursor-pointer ${
                      isActive
                        ? 'bg-[#EEF3FF] text-[#1547F5] font-semibold'
                        : 'text-[#4C5B82] hover:bg-[#F5F7FB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-[#1547F5]' : 'text-[#7E8AA8]'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EEF3FF] text-[#1547F5]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
