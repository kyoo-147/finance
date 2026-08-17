import React, { useState } from 'react';
import {
  PieChart,
  CheckCircle2,
  RotateCcw,
  Save,
  Plus,
  Minus,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { HeroBanner } from '../components/common/HeroBanner';
import { DonutChart } from '../components/common/Charts';
import { formatMoney, formatPercent } from '../domain/formatters';
import { selectNetProfit, selectCalculatedAllocations } from '../domain/selectors';
import { ProfitAllocationRule } from '../types';

export const AllocationPage: React.FC = () => {
  const { transactions, allocationRules, saveAllocationDefaults } = useFinance();

  const netProfit = selectNetProfit(transactions);
  const [rulesDraft, setRulesDraft] = useState<ProfitAllocationRule[]>(allocationRules);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Check if draft rules differ from initial rules
  const isDirty = JSON.stringify(rulesDraft) !== JSON.stringify(allocationRules);

  const totalBps = rulesDraft.reduce((sum, r) => sum + (r.enabled ? r.percentageBps : 0), 0);
  const isBalanced = totalBps === 10000;

  const handlePercentageChange = (id: string, newBps: number) => {
    const clamped = Math.min(10000, Math.max(0, newBps));
    setRulesDraft((prev) =>
      prev.map((r) => (r.id === id ? { ...r, percentageBps: clamped } : r))
    );
  };

  const handleStep = (id: string, deltaBps: number) => {
    setRulesDraft((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, percentageBps: Math.min(10000, Math.max(0, r.percentageBps + deltaBps)) } : r
      )
    );
  };

  const handleSave = async () => {
    if (!isBalanced || !isDirty) return;
    try { setSaveError(null); await saveAllocationDefaults(rulesDraft); } catch { setSaveError('Could not save allocation rules.'); }
  };

  const handleReset = () => {
    setRulesDraft(allocationRules);
  };

  const calculatedAllocations = selectCalculatedAllocations(netProfit, rulesDraft);
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

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <HeroBanner
        title="Profit Allocation"
        subtitle="Distribute Net Operating Profit into tax reserves, buffer, and owner dividend accounts."
        compact
      />

      {/* Main Allocation Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Rules Stepper Panel (7 cols) */}
        <div className="xl:col-span-7 bg-white rounded-[16px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Net Operating Profit
              </div>
              <div className="text-[26px] font-bold text-slate-900 tabular-nums leading-tight">
                {formatMoney(netProfit)}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Subtle Balanced Indicator */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border ${
                  isBalanced
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                    : 'bg-rose-50 text-rose-800 border-rose-200/60'
                }`}
              >
                {isBalanced && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                <span>Total: {formatPercent(totalBps)}</span>
                <span className="text-[11px] opacity-75">
                  {isBalanced ? '(Balanced)' : '(Target 100%)'}
                </span>
              </div>

              {isDirty && (
                <button
                  onClick={handleReset}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-md transition-all cursor-pointer border border-slate-200"
                  title="Reset Changes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Allocation Bucket Rows */}
          <div className="divide-y divide-slate-100">
            {rulesDraft.map((rule) => {
              const calcAmount = Math.round((Math.max(0, netProfit) * rule.percentageBps) / 10000);
              const percentageVal = (rule.percentageBps / 100).toFixed(1);

              return (
                <div
                  key={rule.id}
                  className="py-3.5 px-2 rounded-lg hover:bg-slate-50/60 transition-all flex items-center justify-between gap-3 min-w-0"
                >
                  {/* Bucket Name */}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] text-slate-900 truncate" title={rule.name}>
                      {rule.name}
                    </div>
                  </div>

                  {/* Right: Refined Stepper Control & High-Hierarchy Calculated Amount */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Stepper Control */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleStep(rule.id, -50)}
                        disabled={rule.percentageBps <= 0}
                        className="p-1 text-slate-500 hover:bg-slate-200/60 disabled:opacity-30 rounded transition-all cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <div className="flex items-center px-1.5 w-16">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={percentageVal}
                          onChange={(e) =>
                            handlePercentageChange(
                              rule.id,
                              Math.round(parseFloat(e.target.value || '0') * 100)
                            )
                          }
                          className="w-full text-[12.5px] font-bold text-slate-800 outline-none text-right bg-transparent tabular-nums"
                        />
                        <span className="text-[11px] font-medium text-slate-400 ml-0.5">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStep(rule.id, 50)}
                        disabled={rule.percentageBps >= 10000}
                        className="p-1 text-slate-500 hover:bg-slate-200/60 disabled:opacity-30 rounded transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Primary Amount */}
                    <div className="font-bold text-[15px] text-slate-900 w-28 text-right flex-shrink-0 truncate tabular-nums">
                      {formatMoney(calcAmount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {saveError && <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{saveError}</div>}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[12px] text-slate-400">
              Rule changes save to default profile.
            </span>

            {/* Save Button is active ONLY when rules differ and total is 100% */}
            <button
              onClick={handleSave}
              disabled={!isBalanced || !isDirty}
              className={`px-4 py-2 rounded-lg text-[12.5px] font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isBalanced && isDirty
                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Allocation Rules</span>
            </button>
          </div>
        </div>

        {/* Donut Chart Panel (5 cols) */}
        <div className="xl:col-span-5 bg-white rounded-[14px] border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-[14px] text-slate-900">
              Allocation Breakdown
            </h3>
          </div>

          <DonutChart data={donutData} centerLabel="Net Profit" centerValue={formatMoney(netProfit)} />
        </div>
      </div>
    </div>
  );
};
