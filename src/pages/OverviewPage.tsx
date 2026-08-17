import React from 'react';
import {
  TrendingUp,
  CreditCard,
  Building2,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { HeroBanner } from '../components/common/HeroBanner';
import { DonutChart, DualBarLineChart } from '../components/common/Charts';
import { formatMoney } from '../domain/formatters';
import {
  selectTotalBusinessIncome,
  selectBusinessExpenses,
  selectNetProfit,
  selectNeedsReviewCount,
  selectCalculatedAllocations,
  selectNetWorth,
  selectPortfolioValue,
  selectLiquidAssets,
  selectTaxReserve,
} from '../domain/selectors';

export const OverviewPage: React.FC = () => {
  const {
    transactions,
    categories,
    allocationRules,
    assets,
    liabilities,
    holdings,
    activityEvents,
    setActiveTab,
    markReviewed,
  } = useFinance();

  const totalIncome = selectTotalBusinessIncome(transactions);
  const businessExpenses = selectBusinessExpenses(transactions);
  const netProfit = selectNetProfit(transactions);
  const taxBps = allocationRules.find((rule) => rule.name.toLowerCase().includes('tax'))?.percentageBps ?? 2500;
  const taxReserve = selectTaxReserve(transactions, taxBps);
  const reviewCount = selectNeedsReviewCount(transactions);

  const netWorth = selectNetWorth(assets, liabilities);
  const portfolioValue = selectPortfolioValue(holdings);

  // A current balance must come from an owner-entered asset, not inferred from
  // mixed bank-statement movements.
  const currentCash = selectLiquidAssets(assets);

  const reviewTxns = transactions.filter((t) => t.reviewStatus === 'needs_review').slice(0, 5);

  const calculatedAllocations = selectCalculatedAllocations(netProfit, allocationRules);
  const donutData = calculatedAllocations
    .filter((a) => a.enabled)
    .map((a, idx) => {
      const colors = ['#2563EB', '#16A35A', '#D97706', '#7C3AED', '#0284C7', '#DC2626', '#475569'];
      return {
        label: a.name,
        value: a.amountMinor,
        color: colors[idx % colors.length],
      };
    });

  const cashFlow6MonthsData = Array.from(transactions.filter((t) => t.includedInProfit).reduce((months, transaction) => {
    const month = transaction.occurredAt.slice(0, 7);
    const current = months.get(month) ?? { label: month, cashIn: 0, cashOut: 0, net: 0 };
    if (transaction.type === 'income') current.cashIn += transaction.amountMinor;
    else current.cashOut += Math.abs(transaction.amountMinor);
    current.net = current.cashIn - current.cashOut;
    months.set(month, current);
    return months;
  }, new Map<string, { label: string; cashIn: number; cashOut: number; net: number }>() ).values()).sort((a, b) => a.label.localeCompare(b.label)).slice(-6);

  return (
    <div className="space-y-6">
      {/* Light & Refined Hero Header */}
      <HeroBanner
        title="Financial Position"
        subtitle="Based only on reports imported into this computer."
        compact
      >
        <div className="flex items-center gap-3 bg-slate-800/80 rounded-[12px] px-3.5 py-2 border border-slate-700/60 text-white">
          <div className="text-right">
            <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wide">Review Status</div>
            <div className="text-[13px] font-bold text-emerald-400">{reviewCount} items pending</div>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-[6px] transition-all cursor-pointer"
          >
            Action
          </button>
        </div>
      </HeroBanner>

      {/* 4 Prioritized Core Financial Cards: Net Profit / Cash / Net Worth / Tax Reserve */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Net Profit */}
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium">
            <span>Net Profit</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded-full">
              Imported data
            </span>
          </div>
          <div className="text-[24px] font-bold text-slate-900 tabular-nums mt-2">
            {formatMoney(netProfit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>In: {formatMoney(totalIncome)}</span>
            <span>Out: {formatMoney(businessExpenses)}</span>
          </div>
        </div>

        {/* 2. Current Cash */}
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium">
            <span>Current Cash</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded-full">
              Manual balance
            </span>
          </div>
          <div className="text-[24px] font-bold text-slate-900 tabular-nums mt-2">
            {formatMoney(currentCash)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Update in Net Worth</span>
            <button
              onClick={() => setActiveTab('cash-flow')}
              className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Details →
            </button>
          </div>
        </div>

        {/* 3. Net Worth */}
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium">
            <span>Net Worth</span>
            <span className="text-[10px] text-slate-600 bg-slate-100 font-semibold px-2 py-0.5 rounded-full">
              Overall Wealth
            </span>
          </div>
          <div className="text-[24px] font-bold text-slate-900 tabular-nums mt-2">
            {formatMoney(netWorth)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Portfolio: {formatMoney(portfolioValue)}</span>
            <button
              onClick={() => setActiveTab('net-worth')}
              className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              View →
            </button>
          </div>
        </div>

        {/* 4. Tax Reserve */}
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium">
            <span>Tax Reserve</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 font-semibold px-2 py-0.5 rounded-full">
              Allocation rule
            </span>
          </div>
          <div className="text-[24px] font-bold text-slate-900 tabular-nums mt-2">
            {formatMoney(taxReserve)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Auto-allocated from Net Operating Profit
          </div>
        </div>
      </div>

      {/* Main Focal Point Section: Transactions Requiring Review (Left 8 cols) + Secondary Modules (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Focal Point: Transactions Requiring Review (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-[14px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="font-semibold text-[15px] text-slate-900">
                Transactions Requiring Action
              </h3>
              <span className="bg-amber-50 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums">
                {reviewCount} pending
              </span>
            </div>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-[12px] font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clean, Non-bloated Action Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100 uppercase tracking-wider">
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium">Description</th>
                  <th className="pb-2.5 font-medium text-right">Amount</th>
                  <th className="pb-2.5 font-medium text-center">Suggested Category</th>
                  <th className="pb-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {reviewTxns.map((txn) => {
                  const catName = categories.find((c) => c.id === txn.categoryId)?.name || 'Uncategorized';
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 text-slate-400 text-[11.5px] font-medium whitespace-nowrap">
                        {txn.occurredAt}
                      </td>
                      <td className="py-3 font-medium text-slate-900 whitespace-nowrap max-w-[200px] truncate" title={txn.description}>
                        {txn.description}
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatMoney(txn.amountMinor)}
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          {catName}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => markReviewed(txn.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium px-3 py-1 rounded-[6px] transition-all cursor-pointer shadow-xs"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 text-[11.5px] text-slate-500 flex items-center justify-between border-t border-slate-100">
            <span>Reviewing items ensures tax reserves and P&L reflect real business activity.</span>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-slate-700 font-semibold hover:underline cursor-pointer"
            >
              Open Ledger →
            </button>
          </div>
        </div>

        {/* Secondary Modules Column (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Profit Allocation Card */}
          <div className="bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="font-semibold text-[14px] text-slate-900">Profit Allocation</h3>
              <button
                onClick={() => setActiveTab('allocation')}
                className="text-[11.5px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Configure
              </button>
            </div>
            <DonutChart data={donutData} centerLabel="Net Profit" centerValue={formatMoney(netProfit)} />
          </div>

          {/* Upload Reports (Compact & Secondary) */}
          <div className="bg-white rounded-[14px] border border-slate-200/80 p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[13px] font-semibold text-slate-900">
                Upload Feeds
              </span>
              <button
                onClick={() => setActiveTab('imports')}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
              >
                Import Hub →
              </button>
            </div>

            <div className="space-y-1.5 text-[11.5px]">
              <div
                onClick={() => setActiveTab('imports')}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <span className="font-medium text-slate-800">Import reports</span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Open hub
                </span>
              </div>
              <div
                onClick={() => setActiveTab('imports')}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <span className="font-medium text-slate-800">Review uncategorised items</span>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                  {reviewCount} pending
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Section */}
      <div className="bg-white rounded-[16px] border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-[15px] text-slate-900">6-Month Cash Flow Trend</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Comparing operating inflows and outflows across recent monthly periods.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('cash-flow')}
            className="text-[12px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1 rounded-md cursor-pointer"
          >
            Cash Flow Details →
          </button>
        </div>

        <DualBarLineChart data={cashFlow6MonthsData} height={180} />
      </div>
    </div>
  );
};
