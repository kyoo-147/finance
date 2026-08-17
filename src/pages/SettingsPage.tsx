import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CreditCard,
  Sliders,
  Bell,
  Shield,
  Save,
  Trash2,
  RefreshCw,
  Smartphone,
  Key,
  Download,
  Upload,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { HeroBanner } from '../components/common/HeroBanner';
import { financeApi } from '../api/client';

type TabType = 'general' | 'connections' | 'categorization' | 'notifications' | 'security';

export const SettingsPage: React.FC = () => {
  const {
    businessProfile,
    updateBusinessProfile,
    connectedAccounts,
    toggleAccountStatus,
    categoryRules,
    updateCategoryRule,
    deleteCategoryRule,
    reRunCategoryRules,
    settings,
    updateSettings,
    categories,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<TabType>('general');

  // General profile state
  const [bizName, setBizName] = useState(businessProfile.name);
  const [ownerName, setOwnerName] = useState(businessProfile.ownerName);
  const [email, setEmail] = useState(businessProfile.email);
  const [abn, setAbn] = useState(businessProfile.abn);
  const [isSaved, setIsSaved] = useState(false);

  // Confirmation state
  const [confirmDisconnectId, setConfirmDisconnectId] = useState<string | null>(null);
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<(typeof categoryRules)[number] | null>(null);
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleScope, setRuleScope] = useState<'business' | 'personal'>('business');
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    setBizName(businessProfile.name);
    setOwnerName(businessProfile.ownerName);
    setEmail(businessProfile.email);
    setAbn(businessProfile.abn);
  }, [businessProfile]);

  const handleSaveProfile = async () => {
    try {
      await updateBusinessProfile({ name: bizName, ownerName, email, abn });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch {
      setIsSaved(false);
    }
  };
  const handleRestore = async (file?: File) => {
    if (!file || !window.confirm('Restore will replace all current local data with this backup. Continue?')) return;
    setIsRestoring(true); setBackupMessage(null);
    try { const result = await financeApi.restoreBackup(file); setBackupMessage(`Restored backup created ${new Date(result.manifest.createdAt).toLocaleString()}. Reloading data…`); window.setTimeout(() => window.location.reload(), 700); }
    catch (error) { setBackupMessage(error instanceof Error ? error.message : 'Could not restore this backup.'); }
    finally { setIsRestoring(false); if (restoreInputRef.current) restoreInputRef.current.value = ''; }
  };

  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'connections', label: 'Import Sources', icon: CreditCard },
    { id: 'categorization', label: 'Categorization', icon: Sliders },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Local Data', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner (Matching Original Design Screenshot 6) */}
      <HeroBanner
        title="System Settings & Configuration"
        subtitle="Manage local profile details, CSV import sources, and automatic categorization rules."
      >
        <div className="bg-white/10 backdrop-blur-md rounded-[14px] p-4 border border-white/15 text-white w-full sm:w-64 space-y-1">
          <div className="text-[10px] text-blue-100 font-semibold uppercase">Entity Profile</div>
          <div className="text-[18px] font-extrabold text-white truncate">{bizName}</div>
          <div className="text-[11px] text-emerald-300 font-medium">Local-only service</div>
        </div>
      </HeroBanner>

      {/* Secondary Navigation Bar (Tabs) */}
      <div className="bg-white rounded-[14px] border border-slate-200/80 p-1.5 shadow-2xs flex flex-wrap gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[12px] font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-[14px] border border-slate-200/90 p-6 shadow-2xs">
        {/* 1. General Profile */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-[15px] text-slate-900">
                Business & Account Profile
              </h3>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Update legal business details used for report generation and tax summaries.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Company Legal Name</label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] text-slate-900 font-medium mt-1 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">ABN / Business ID</label>
                <input
                  type="text"
                  value={abn}
                  onChange={(e) => setAbn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] text-slate-900 font-medium mt-1 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Owner / Primary Contact</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] text-slate-900 font-medium mt-1 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Notification Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[8px] px-3 py-2 text-[13px] text-slate-900 font-medium mt-1 outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {isSaved ? (
                <span className="text-[12px] text-emerald-600 font-medium">Changes saved successfully</span>
              ) : (
                <span />
              )}
              <button
                onClick={handleSaveProfile}
                className="bg-slate-900 text-white hover:bg-slate-800 text-[12px] font-medium px-4 py-2 rounded-[8px] cursor-pointer shadow-2xs"
              >
                Save Profile Changes
              </button>
            </div>
          </div>
        )}

        {/* 2. Connected Sources */}
        {activeTab === 'connections' && (
          <div className="space-y-6 max-w-2xl">
            <div className="pb-3 border-b border-[#E7EBF3]">
              <h3 className="font-bold text-[16px] text-[#08123D] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#1547F5]" /> Connected Financial Sources
              </h3>
              <p className="text-[12px] text-[#7E8AA8] mt-0.5">
                Select the CSV source when importing. This app does not connect to external accounts automatically.
              </p>
            </div>

            <div className="space-y-3">
              {connectedAccounts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-4 rounded-[12px] bg-[#F8FAFD] border border-[#E7EBF3]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#EEF3FF] text-[#1547F5] font-bold text-sm flex items-center justify-center">
                      {a.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-[13px] text-[#08123D]">{a.displayName}</div>
                      <div className="text-[11px] text-[#7E8AA8]">
                        Available for CSV import
                      </div>
                    </div>
                  </div>

                  {confirmDisconnectId === a.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#DC2626] font-semibold">Confirm toggle?</span>
                      <button
                        onClick={() => {
                          void toggleAccountStatus(a.id).catch(() => undefined);
                          setConfirmDisconnectId(null);
                        }}
                        className="bg-[#DC2626] text-white hover:bg-[#B91C1C] text-[11px] font-bold px-3 py-1 rounded-[6px] cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDisconnectId(null)}
                        className="text-[11px] text-[#7E8AA8] hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDisconnectId(a.id)}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-[8px] cursor-pointer transition-all ${
                        a.status === 'connected'
                          ? 'bg-[#E9F8F0] text-[#16A35A] hover:bg-[#DC2626]/10 hover:text-[#DC2626]'
                          : 'bg-[#EEF3FF] text-[#1547F5] hover:bg-[#1547F5] hover:text-white'
                      }`}
                    >
                      {a.status === 'connected' ? 'Disable source' : 'Enable source'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Categorization Rules */}
        {activeTab === 'categorization' && (
          <div className="space-y-6 max-w-2xl">
            <div className="pb-3 border-b border-[#E7EBF3] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[16px] text-[#08123D] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#1547F5]" /> Auto-Categorization Rules
                </h3>
                <p className="text-[12px] text-[#7E8AA8] mt-0.5">
                  Automate scope and category tags for incoming bank statement lines.
                </p>
              </div>

              <button
                onClick={() => void reRunCategoryRules().catch(() => undefined)}
                className="bg-[#EEF3FF] text-[#1547F5] hover:bg-[#1547F5] hover:text-white text-[11px] font-semibold px-3 py-1.5 rounded-[8px] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-run All Rules
              </button>
            </div>

            <div className="space-y-2">
              {categoryRules.map((r) => {
                const targetCat = categories.find((c) => c.id === r.action.categoryId)?.name || 'Category';
                return (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-[12px] bg-[#F8FAFD] border border-[#E7EBF3] flex items-center justify-between text-[12px]"
                  >
                    <div>
                      <div className="font-bold text-[#08123D]">
                        Contains "{r.conditions[0]?.value}"
                      </div>
                      <div className="text-[11px] text-[#7E8AA8] mt-0.5">
                        Set Category → <span className="font-semibold text-[#08123D]">{targetCat}</span> ({r.action.scope})
                      </div>
                    </div>

                    {confirmDeleteRuleId === r.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            void deleteCategoryRule(r.id).catch(() => undefined);
                            setConfirmDeleteRuleId(null);
                          }}
                          className="bg-[#DC2626] text-white text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer"
                        >
                          Delete Rule
                        </button>
                        <button
                          onClick={() => setConfirmDeleteRuleId(null)}
                          className="text-[10px] text-[#7E8AA8] hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingRule(r); setRuleKeyword(r.conditions[0]?.value ?? ''); setRuleCategory(r.action.categoryId); setRuleScope(r.action.scope === 'business' ? 'business' : 'personal'); }}
                          className="text-[10px] font-semibold text-[#1547F5] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteRuleId(r.id)}
                        className="p-1.5 text-[#7E8AA8] hover:text-[#DC2626] transition-colors cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-2xl">
            <div className="pb-3 border-b border-[#E7EBF3]">
              <h3 className="font-bold text-[16px] text-[#08123D] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#1547F5]" /> Alert & Email Preferences
              </h3>
              <p className="text-[12px] text-[#7E8AA8] mt-0.5">
                Choose when and how you receive financial exception and tax deadline alerts.
              </p>
            </div>

            <div className="space-y-3 text-[12px]">
              <div className="flex items-center justify-between p-4 rounded-[12px] bg-[#F8FAFD] border border-[#E7EBF3]">
                <div>
                  <div className="font-bold text-[#08123D]">Weekly Executive Summary</div>
                  <div className="text-[11px] text-[#7E8AA8] mt-0.5">Receive key net profit and cash flow trends every Monday</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.weeklySummary}
                  onChange={(e) => void updateSettings('notifications', { weeklySummary: e.target.checked }).catch(() => undefined)}
                  className="w-4 h-4 rounded border-[#DCE3EF] text-[#1547F5] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-[12px] bg-[#F8FAFD] border border-[#E7EBF3]">
                <div>
                  <div className="font-bold text-[#08123D]">Uncategorized Import Alerts</div>
                  <div className="text-[11px] text-[#7E8AA8] mt-0.5">Notify when newly imported statement lines have categorization issues</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.transactionImportIssues}
                  onChange={(e) => void updateSettings('notifications', { transactionImportIssues: e.target.checked }).catch(() => undefined)}
                  className="w-4 h-4 rounded border-[#DCE3EF] text-[#1547F5] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-[12px] bg-[#F8FAFD] border border-[#E7EBF3]">
                <div>
                  <div className="font-bold text-[#08123D]">Low Cash Flow & Runway Alerts</div>
                  <div className="text-[11px] text-[#7E8AA8] mt-0.5">Alert when cash reserve buffer drops below 3 months</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.lowCashFlowAlert}
                  onChange={(e) => void updateSettings('notifications', { lowCashFlowAlert: e.target.checked }).catch(() => undefined)}
                  className="w-4 h-4 rounded border-[#DCE3EF] text-[#1547F5] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Security */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-2xl">
            <div className="pb-3 border-b border-[#E7EBF3]">
              <h3 className="font-bold text-[16px] text-[#08123D] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1547F5]" /> Local Data & Backups
              </h3>
              <p className="text-[12px] text-[#7E8AA8] mt-0.5">
                Data stays on this computer. Export a verified backup before restoring or moving to another device.
              </p>
            </div>

            <div className="space-y-3 text-[12px]">
              <div className="flex items-center justify-between p-4 rounded-[12px] bg-[#F8FAFD] border border-[#E7EBF3]">
                <div>
                  <div className="font-bold text-[#08123D] flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#1547F5]" /> Local-only access
                  </div>
                  <div className="text-[11px] text-[#7E8AA8] mt-0.5">The service is available only on this computer.</div>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  readOnly
                  className="w-4 h-4 rounded border-[#DCE3EF] text-[#1547F5] cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-[12px] bg-[#F8FAFD] border border-[#E7EBF3] flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-[#08123D] flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[#1547F5]" /> Export verified backup
                  </div>
                  <div className="text-[11px] text-[#7E8AA8] mt-0.5">Downloads one local JSON backup with an SHA-256 checksum.</div>
                </div>
                <button
                  onClick={() => financeApi.downloadBackup()}
                  className="bg-white border border-[#DCE3EF] text-[#1547F5] text-[11px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-blue-50 cursor-pointer"
                >
                  Download backup
                </button>
              </div>

              <div className="p-4 rounded-[12px] bg-[#FFF8F3] border border-[#F3D6C2] flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-[#08123D] flex items-center gap-1.5"><Upload className="w-4 h-4 text-[#B45309]" /> Restore a verified backup</div>
                  <div className="text-[11px] text-[#7E8AA8] mt-0.5">Checks checksum and SQLite integrity before replacing local data. This cannot be undone.</div>
                </div>
                <input ref={restoreInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void handleRestore(event.target.files?.[0])} />
                <button disabled={isRestoring} onClick={() => restoreInputRef.current?.click()} className="bg-white border border-[#F3D6C2] text-[#B45309] text-[11px] font-semibold px-3 py-1.5 rounded-[8px] hover:bg-orange-50 disabled:opacity-50 cursor-pointer">{isRestoring ? 'Restoring…' : 'Choose backup'}</button>
              </div>
              {backupMessage && <div role="status" className="text-[11px] text-[#475569] px-1">{backupMessage}</div>}
              <p className="text-[11px] text-[#7E8AA8] px-1">No online account, password reset, or session tracking exists in this local-only version. Protect this Windows account and enable BitLocker where available.</p>
            </div>
          </div>
        )}
      </div>
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3"><h3 className="font-bold">Edit categorization rule</h3><button onClick={() => setEditingRule(null)} aria-label="Close rule editor">×</button></div>
            <label className="block text-xs font-semibold uppercase text-slate-500">Description contains<input value={ruleKeyword} onChange={(e) => setRuleKeyword(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-semibold uppercase text-slate-500">Category<select value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="block text-xs font-semibold uppercase text-slate-500">Scope<select value={ruleScope} onChange={(e) => setRuleScope(e.target.value as 'business' | 'personal')} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"><option value="business">Business</option><option value="personal">Personal</option></select></label>
            <div className="flex justify-end gap-2"><button onClick={() => setEditingRule(null)} className="rounded-lg px-3 py-2 text-sm">Cancel</button><button onClick={() => void updateCategoryRule(editingRule.id, { priority: editingRule.priority, enabled: true, conditions: [{ field: 'description', operator: 'contains', value: ruleKeyword }], action: { categoryId: ruleCategory, scope: ruleScope, includedInProfit: true } }).then(() => setEditingRule(null)).catch(() => undefined)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Save rule</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
