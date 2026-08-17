import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Building,
  ShieldAlert,
  TrendingUp,
  X,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { HeroBanner } from '../components/common/HeroBanner';
import { AreaLineChart, DonutChart } from '../components/common/Charts';
import { formatMoney } from '../domain/formatters';
import { selectTotalAssets, selectTotalLiabilities, selectNetWorth } from '../domain/selectors';

export const NetWorthPage: React.FC = () => {
  const { assets, liabilities, addAsset, updateAsset, deleteAsset, addLiability, updateLiability, deleteLiability } = useFinance();

  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddLiabModal, setShowAddLiabModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Asset Form state
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('savings');
  const [assetValue, setAssetValue] = useState('');

  // New Liability Form state
  const [liabName, setLiabName] = useState('');
  const [liabCategory, setLiabCategory] = useState('credit_card');
  const [liabBalance, setLiabBalance] = useState('');

  const totalAssets = selectTotalAssets(assets);
  const totalLiabilities = selectTotalLiabilities(liabilities);
  const netWorth = selectNetWorth(assets, liabilities);

  // Refined, muted color palettes for charts
  const assetColors = ['#0F172A', '#059669', '#2563EB', '#D97706', '#0284C7', '#7C3AED'];
  const liabColors = ['#DC2626', '#D97706', '#475569', '#7C3AED'];

  const assetDonutData = assets.map((a, idx) => ({
    label: a.name,
    value: a.valueMinor,
    color: assetColors[idx % assetColors.length],
  }));

  const liabDonutData = liabilities.map((l, idx) => ({
    label: l.name,
    value: l.balanceMinor,
    color: liabColors[idx % liabColors.length],
  }));

  const netWorthTrend = [{ label: 'Current', value: netWorth }];

  const handleAddAsset = async () => {
    const value = Number(assetValue);
    if (!assetName.trim() || !Number.isFinite(value) || value < 0) { setFormError('Enter a name and a non-negative AUD value.'); return; }
    try {
      if (editingAssetId) await updateAsset(editingAssetId, { name: assetName.trim(), category: assetCategory, valueMinor: Math.round(value * 100) });
      else await addAsset({ name: assetName.trim(), category: assetCategory, valueMinor: Math.round(value * 100) });
      setAssetName(''); setAssetValue(''); setEditingAssetId(null); setFormError(null); setShowAddAssetModal(false);
    } catch { setFormError('Could not save this asset.'); }
  };

  const handleAddLiability = async () => {
    const value = Number(liabBalance);
    if (!liabName.trim() || !Number.isFinite(value) || value < 0) { setFormError('Enter a name and a non-negative AUD balance.'); return; }
    try {
      if (editingLiabilityId) await updateLiability(editingLiabilityId, { name: liabName.trim(), category: liabCategory, balanceMinor: Math.round(value * 100) });
      else await addLiability({ name: liabName.trim(), category: liabCategory, balanceMinor: Math.round(value * 100) });
      setLiabName(''); setLiabBalance(''); setEditingLiabilityId(null); setFormError(null); setShowAddLiabModal(false);
    } catch { setFormError('Could not save this liability.'); }
  };

  const editAsset = (asset: typeof assets[number]) => { setEditingAssetId(asset.id); setAssetName(asset.name); setAssetCategory(asset.category); setAssetValue((asset.valueMinor / 100).toFixed(2)); setFormError(null); setShowAddAssetModal(true); };
  const editLiability = (liability: typeof liabilities[number]) => { setEditingLiabilityId(liability.id); setLiabName(liability.name); setLiabCategory(liability.category); setLiabBalance((liability.balanceMinor / 100).toFixed(2)); setFormError(null); setShowAddLiabModal(true); };
  const confirmDelete = (id: string, type: 'asset' | 'liability') => {
    if (type === 'asset') {
      deleteAsset(id);
    } else {
      deleteLiability(id);
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Refined Page Header */}
      <HeroBanner
        title="Net Worth & Holdings"
        subtitle="Current assets and liabilities recorded in this portal."
        compact
      >
        <div className="flex items-center gap-3 bg-slate-800/80 rounded-[12px] px-3.5 py-2 border border-slate-700/60 text-white">
          <div className="text-right">
            <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Equity Position</div>
            <div className="text-[14px] font-bold text-emerald-400 tabular-nums">{formatMoney(netWorth)}</div>
          </div>
          <div className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-500/30">
            Current record
          </div>
        </div>
      </HeroBanner>

      {/* Primary Financial Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Worth Primary Stat */}
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium">
            <span>Total Net Worth</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full">
              Current record
            </span>
          </div>
          <div className="text-[26px] font-bold text-slate-900 tabular-nums mt-2">
            {formatMoney(netWorth)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Assets minus Liabilities</span>
            <span className="text-slate-600 font-medium">Primary Focus</span>
          </div>
        </div>

        {/* Total Assets */}
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium">
            <span>Total Assets</span>
            <span className="text-[10px] text-slate-600 bg-slate-100 font-semibold px-2 py-0.5 rounded-full">
              {assets.length} items
            </span>
          </div>
          <div className="text-[26px] font-bold text-slate-900 tabular-nums mt-2">
            {formatMoney(totalAssets)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Cash, Accounts & Property</span>
            <button
              onClick={() => setShowAddAssetModal(true)}
              className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-5 shadow-2xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-[12px] text-slate-500 font-medium">
            <span>Total Liabilities</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 font-semibold px-2 py-0.5 rounded-full">
              {liabilities.length} obligations
            </span>
          </div>
          <div className="text-[26px] font-bold text-slate-900 tabular-nums mt-2">
            {formatMoney(totalLiabilities)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Debts & Outstanding Balances</span>
            <button
              onClick={() => setShowAddLiabModal(true)}
              className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Trajectory Area Line Chart */}
      <div className="bg-white rounded-[14px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[15px] text-slate-900">Net Worth Trajectory</h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md tabular-nums">
            Current snapshot; historical balances are not recorded yet
          </span>
        </div>

        <AreaLineChart data={netWorthTrend} height={150} lineColor="#0F172A" />
      </div>

      {/* Assets & Liabilities Detailed Breakdown Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Assets Panel */}
        <div className="bg-white rounded-[14px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[15px] text-slate-900">
                Asset Allocation ({assets.length})
              </h3>
            </div>
            <button
              onClick={() => setShowAddAssetModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-[11.5px] font-medium px-3 py-1 rounded-[6px] transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              + Add Asset
            </button>
          </div>

          <DonutChart data={assetDonutData} centerLabel="Total Assets" centerValue={formatMoney(totalAssets)} />

          <div className="space-y-1.5 pt-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 pb-1 flex justify-between">
              <span>Holding</span>
              <span>Value</span>
            </div>
            {assets.map((a) => {
              const pct = totalAssets > 0 ? ((a.valueMinor / totalAssets) * 100).toFixed(1) : '0';
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-[10px] bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/60 transition-colors min-w-0"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-medium text-[13px] text-slate-900 truncate" title={a.name}>
                      {a.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded capitalize">
                        {a.category.replace('_', ' ')}
                      </span>
                      <span className="text-[10.5px] text-slate-400">{pct}% of total</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-semibold text-[13.5px] text-slate-900 tabular-nums">
                      {formatMoney(a.valueMinor)}
                    </span>
                    {deleteConfirmId === a.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => confirmDelete(a.id, 'asset')}
                          className="text-[10px] font-semibold bg-rose-600 text-white px-2 py-0.5 rounded cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => editAsset(a)} className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" title="Edit asset">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(a.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liabilities Panel */}
        <div className="bg-white rounded-[14px] border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[15px] text-slate-900">
                Liability Obligations ({liabilities.length})
              </h3>
            </div>
            <button
              onClick={() => setShowAddLiabModal(true)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-[11.5px] font-medium px-3 py-1 rounded-[6px] transition-all flex items-center gap-1 cursor-pointer"
            >
              + Add Liability
            </button>
          </div>

          <DonutChart data={liabDonutData} centerLabel="Total Liabilities" centerValue={formatMoney(totalLiabilities)} />

          <div className="space-y-1.5 pt-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 pb-1 flex justify-between">
              <span>Obligation</span>
              <span>Balance</span>
            </div>
            {liabilities.map((l) => {
              const pct = totalLiabilities > 0 ? ((l.balanceMinor / totalLiabilities) * 100).toFixed(1) : '0';
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-3 rounded-[10px] bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/60 transition-colors min-w-0"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-semibold text-[13px] text-slate-900 truncate" title={l.name}>
                      {l.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded capitalize">
                        {l.category.replace('_', ' ')}
                      </span>
                      <span className="text-[10.5px] text-slate-400">{pct}% of total</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-bold text-[13.5px] text-amber-700 tabular-nums">
                      {formatMoney(l.balanceMinor)}
                    </span>
                    {deleteConfirmId === l.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => confirmDelete(l.id, 'liability')}
                          className="text-[10px] font-semibold bg-rose-600 text-white px-2 py-0.5 rounded cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => editLiability(l)} className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" title="Edit liability">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(l.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove liability"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[16px] text-slate-900">{editingAssetId ? 'Edit Asset' : 'Add New Asset'}</h3>
              <button
                onClick={() => setShowAddAssetModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Asset Name</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. High Yield Savings Account"
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] mt-1 outline-none focus:border-slate-400 text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Category</label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] mt-1 outline-none focus:border-slate-400 text-slate-900"
                >
                  <option value="savings">Savings / Cash</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="investment">Investments / Stocks</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="other">Other Asset</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Estimated Value ($ AUD)</label>
                <input
                  type="number"
                  value={assetValue}
                  onChange={(e) => setAssetValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] mt-1 outline-none focus:border-slate-400 text-slate-900"
                />
              </div>
            </div>

            {formError && <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</div>}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => { setShowAddAssetModal(false); setEditingAssetId(null); setFormError(null); }}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAsset}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer shadow-xs"
              >
                Save Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Liability Modal */}
      {showAddLiabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-[16px] text-slate-900">{editingLiabilityId ? 'Edit Liability' : 'Add New Liability'}</h3>
              <button
                onClick={() => setShowAddLiabModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Liability Name</label>
                <input
                  type="text"
                  value={liabName}
                  onChange={(e) => setLiabName(e.target.value)}
                  placeholder="e.g. Business Line of Credit"
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] mt-1 outline-none focus:border-slate-400 text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Category</label>
                <select
                  value={liabCategory}
                  onChange={(e) => setLiabCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] mt-1 outline-none focus:border-slate-400 text-slate-900"
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="loan">Personal / Business Loan</option>
                  <option value="tax">Tax Payable</option>
                  <option value="other">Other Liability</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Current Balance ($ AUD)</label>
                <input
                  type="number"
                  value={liabBalance}
                  onChange={(e) => setLiabBalance(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] mt-1 outline-none focus:border-slate-400 text-slate-900"
                />
              </div>
            </div>

            {formError && <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</div>}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => { setShowAddLiabModal(false); setEditingLiabilityId(null); setFormError(null); }}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLiability}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer shadow-xs"
              >
                Save Liability
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
