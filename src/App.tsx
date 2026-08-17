import React, { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar } from './components/common/Sidebar';
import { MobileHeader } from './components/common/MobileHeader';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { AiAssistantDrawer } from './components/common/AiAssistantDrawer';
import { OverviewPage } from './pages/OverviewPage';
import { ImportsPage } from './pages/ImportsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AllocationPage } from './pages/AllocationPage';
import { CashFlowPage } from './pages/CashFlowPage';
import { NetWorthPage } from './pages/NetWorthPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Search, Bell, Sparkles } from 'lucide-react';
import { financialYearLabel, selectLatestTransactionMonth } from './domain/selectors';

const MainLayout: React.FC = () => {
  const { activeTab, setIsSearchOpen, setIsNotificationsOpen, setIsAiAssistantOpen, businessProfile, transactions, isLoading, apiError, refresh } = useFinance();
  const financialYear = financialYearLabel(selectLatestTransactionMonth(transactions), businessProfile.financialYearStartMonth || 7);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFD] text-[#08123D] flex font-sans antialiased selection:bg-[#1547F5] selection:text-white">
      {/* Desktop Sidebar Navigation */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile App Header */}
        <MobileHeader />

        {/* Desktop Top Header Bar (Single sticky floating glass hierarchy) */}
        <header
          className={`hidden lg:flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20 gap-4 transition-all duration-300 ease-in-out ${
            isScrolled
              ? 'h-14 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
              : 'h-16 bg-white/95 backdrop-blur-xs border-b border-[#E7EBF3] shadow-2xs'
          }`}
        >
          {/* Left: Workspace Context & Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#08123D]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Jerri Finance Portal</span>
            </div>
            <span className="text-[#C1C9D9] font-light">/</span>
            <span className="text-[11.5px] font-medium text-[#7E8AA8] bg-[#F4F7FF] px-2.5 py-0.5 rounded-md border border-[#E2E8F0]">
              {financialYear}
            </span>
          </div>

          {/* Right Header Bar Controls */}
          <div className="flex items-center gap-3.5">
            {/* Search Input Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`flex items-center gap-2.5 bg-[#F8FAFD] hover:bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#C1C9D9] text-[#7E8AA8] text-[12.5px] px-3.5 rounded-[10px] w-64 xl:w-72 shadow-2xs transition-all cursor-pointer ${
                isScrolled ? 'py-1' : 'py-1.5'
              }`}
            >
              <Search className="w-4 h-4 text-[#7E8AA8]" />
              <span className="flex-1 text-left truncate">Search transactions, categories...</span>
              <kbd className="bg-white border border-[#E2E8F0] text-[10px] font-mono px-1.5 py-0.5 rounded text-[#64748B] flex items-center gap-0.5">
                ⌘ K
              </kbd>
            </button>

            {/* AI Assistant Quick Trigger (Text only, no icon per requirement) */}
            <button
              onClick={() => setIsAiAssistantOpen(true)}
              className={`flex items-center bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 font-semibold text-[12px] px-3 rounded-[8px] transition-all cursor-pointer ${
                isScrolled ? 'py-1' : 'py-1.5'
              }`}
              title="Open AI Financial Assistant"
            >
              <span>Copilot</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 rounded-[10px] bg-white hover:bg-[#F4F7FF] text-[#4C5B82] hover:text-[#1547F5] relative transition-all cursor-pointer border border-[#E2E8F0] shadow-2xs"
              aria-label="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1547F5]" />
            </button>

            {/* User Profile Avatar Pill */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#E7EBF3]">
              <div
                className={`rounded-full bg-[#EEF3FF] text-[#1547F5] font-bold text-xs flex items-center justify-center overflow-hidden border border-[#CBD5E1] transition-all ${
                  isScrolled ? 'w-7 h-7' : 'w-8 h-8'
                }`}
              >
                <span>{businessProfile.ownerName.charAt(0)}</span>
              </div>
              <div className="text-[12px] hidden xl:block">
                <div className="font-bold text-[#08123D] leading-tight">
                  {businessProfile.ownerName}
                </div>
                <div className="text-[10px] text-[#7E8AA8]">Business Owner</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace View Switcher (Added top padding for clear visual separation) */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 lg:pt-7 pb-12 max-w-[1720px] w-full mx-auto space-y-6">
          {isLoading && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">Loading financial data from this device…</div>}
          {apiError && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{apiError}</span><button onClick={() => void refresh()} className="font-semibold underline">Retry</button></div>}
          {activeTab === 'overview' && <OverviewPage />}
          {activeTab === 'imports' && <ImportsPage />}
          {activeTab === 'transactions' && <TransactionsPage />}
          {activeTab === 'allocation' && <AllocationPage />}
          {activeTab === 'cash-flow' && <CashFlowPage />}
          {activeTab === 'net-worth' && <NetWorthPage />}
          {activeTab === 'investments' && <InvestmentsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <GlobalSearchModal />
      <NotificationDrawer />
      <AiAssistantDrawer />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainLayout />
    </FinanceProvider>
  );
}
