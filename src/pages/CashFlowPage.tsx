import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { HeroBanner } from '../components/common/HeroBanner';
import { AreaLineChart } from '../components/common/Charts';
import { formatMoney } from '../domain/formatters';
import { selectTotalBusinessIncome, selectBusinessExpenses, selectLiquidAssets } from '../domain/selectors';

export const CashFlowPage: React.FC = () => {
  const { transactions, assets } = useFinance();
  const [forecastMonths, setForecastMonths] = useState(3);

  const totalIncome = selectTotalBusinessIncome(transactions);
  const totalExpenses = selectBusinessExpenses(transactions);
  const netCashFlow = totalIncome - totalExpenses;

  const endingCash = selectLiquidAssets(assets);
  const monthMap = transactions.filter((transaction) => transaction.scope === 'business' && transaction.includedInProfit).reduce((acc, transaction) => {
    const month = transaction.occurredAt.slice(0, 7);
    const row = acc.get(month) ?? { month, cashIn: 0, cashOut: 0, net: 0, status: 'Actual' };
    if (transaction.type === 'income') row.cashIn += transaction.amountMinor;
    else row.cashOut += Math.abs(transaction.amountMinor);
    row.net = row.cashIn - row.cashOut; acc.set(month, row); return acc;
  }, new Map<string, { month: string; cashIn: number; cashOut: number; net: number; status: string }>());
  const monthlyBreakdown = Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));
  const avgMonthlyExpense = monthlyBreakdown.length ? Math.round(totalExpenses / monthlyBreakdown.length) : 0;
  const runwayMonths = avgMonthlyExpense > 0 ? (endingCash / avgMonthlyExpense).toFixed(1) : '—';
  const actualSeries = monthlyBreakdown.slice().reverse().map((row) => ({ label: row.month, value: row.net }));
  const averageNet = monthlyBreakdown.length ? Math.round(monthlyBreakdown.reduce((sum, row) => sum + row.net, 0) / monthlyBreakdown.length) : 0;
  const lastMonth = monthlyBreakdown[0]?.month ?? new Date().toISOString().slice(0, 7);
  const [lastYear, lastMonthNumber] = lastMonth.split('-').map(Number);
  const forecastSeries = Array.from({ length: forecastMonths }, (_, index) => {
    const monthIndex = lastMonthNumber - 1 + index + 1;
    const date = new Date(Date.UTC(lastYear + Math.floor(monthIndex / 12), monthIndex % 12, 1));
    return { label: date.toISOString().slice(0, 7), value: averageNet };
  });
  const cashFlowSeries = [...actualSeries, ...forecastSeries];

  return (
    <div className="space-y-6">
      {/* Concise Compact Header */}
      <HeroBanner
        title="Cash Position & Runway"
        subtitle="Monitor operating liquidity, track cash burn, and project forward cash runway."
        compact
      />

      {/* Hierarchy Step 1: Current Cash -> Runway -> Net Surplus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Current Cash Balance */}
        <div className="bg-white rounded-[14px] border border-slate-200/90 p-5 shadow-2xs space-y-2">
          <div className="text-[12px] font-medium text-slate-500">Ending Cash Balance</div>
          <div className="text-[26px] font-bold text-slate-900 tabular-nums">
            {formatMoney(endingCash)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <span>Liquid balances entered in this portal</span>
          </div>
        </div>

        {/* 2. Estimated Runway with Alert */}
        <div className="bg-white rounded-[14px] border border-amber-200/80 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[12px] font-medium text-slate-500">
            <span>Estimated Cash Runway</span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              Low Buffer
            </span>
          </div>
          <div className="text-[26px] font-bold text-slate-900 tabular-nums">
            {runwayMonths} Months
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">
            Based on verified business cash movements; average monthly expenses of {formatMoney(avgMonthlyExpense)}.
          </div>
        </div>

        {/* 3. Monthly Net Surplus (In vs Out) */}
        <div className="bg-white rounded-[14px] border border-slate-200/90 p-5 shadow-2xs space-y-2">
          <div className="text-[12px] font-medium text-slate-500">Imported Net Surplus</div>
          <div className="text-[26px] font-bold text-slate-900 tabular-nums">
            {formatMoney(netCashFlow)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>In: {formatMoney(totalIncome)}</span>
            <span>Out: {formatMoney(totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Hierarchy Step 2: Trend & Forecast Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cash Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-[14px] border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[15px] text-slate-900">Cash Balance Trajectory</h3>
            </div>

            {/* Subtle Forecast Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setForecastMonths(m)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                    forecastMonths === m
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {m}M Forecast
                </button>
              ))}
            </div>
          </div>

          <AreaLineChart data={cashFlowSeries} height={160} lineColor="#059669" />
        </div>

        {/* Actionable Insights (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-[14px] border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <h3 className="font-semibold text-[14px] text-slate-900 pb-2 border-b border-slate-100">
            Actionable Runway Insights
          </h3>

          <div className="space-y-3 text-[12px]">
            <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                Capital Buffer Notice
              </div>
              <p className="text-[11.5px] text-amber-800 leading-relaxed">
                Runway is estimated from imported expenses and the balance entered in Net Worth. Review it after each bank statement import.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-slate-800 space-y-1">
              <div className="font-semibold text-slate-900">Quarterly Tax Provision</div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                Tax reserve follows the current profit-allocation rule and is recalculated from imported business profit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Cash Breakdown Table */}
      <div className="bg-white rounded-[16px] border border-slate-200/90 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-[15px] text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Monthly Cash Movement
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                <th className="py-2 px-3">Period</th>
                <th className="py-2 px-3">Cash In</th>
                <th className="py-2 px-3">Cash Out</th>
                <th className="py-2 px-3">Net Surplus</th>
                <th className="py-2 px-3 text-right">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {monthlyBreakdown.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{row.month}</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold tabular-nums">{formatMoney(row.cashIn)}</td>
                  <td className="py-2.5 px-3 text-slate-900 font-bold tabular-nums">{formatMoney(row.cashOut)}</td>
                  <td className="py-2.5 px-3 text-slate-900 font-bold tabular-nums">{formatMoney(row.net)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`inline-block text-[10.5px] font-medium px-2 py-0.5 rounded ${
                        row.status === 'Actual'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
