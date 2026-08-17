import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ActiveTab, ActivityEvent, Asset, BusinessProfile, Category, CategoryRule, ConnectedAccount, ImportJob, InvestmentHolding, Liability, ProfitAllocationRule, SettingsDTO, Transaction, TransactionScope } from '../types';
import { ApiError, financeApi } from '../api/client';

interface FinanceContextType {
  activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void;
  businessProfile: BusinessProfile; connectedAccounts: ConnectedAccount[]; categories: Category[];
  transactions: Transaction[]; importJobs: ImportJob[]; categoryRules: CategoryRule[];
  allocationRules: ProfitAllocationRule[]; assets: Asset[]; liabilities: Liability[]; holdings: InvestmentHolding[];
  settings: SettingsDTO; activityEvents: ActivityEvent[];
  isLoading: boolean; apiError: string | null; refresh: () => Promise<void>;
  isSearchOpen: boolean; setIsSearchOpen: (open: boolean) => void;
  isNotificationsOpen: boolean; setIsNotificationsOpen: (open: boolean) => void;
  isAiAssistantOpen: boolean; setIsAiAssistantOpen: (open: boolean) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  bulkCategorizeTransactions: (ids: string[], categoryId: string, scope: TransactionScope, includedInProfit: boolean) => Promise<void>;
  markReviewed: (id: string) => Promise<void>; createCategoryRule: (rule: Omit<CategoryRule, 'id'>) => Promise<void>; updateCategoryRule: (id: string, rule: Omit<CategoryRule, 'id'>) => Promise<void>;
  deleteCategoryRule: (id: string) => Promise<void>; reRunCategoryRules: () => Promise<void>;
  uploadImport: (file: File, sourceAccountId: string) => Promise<ImportJob>;
  saveAllocationDefaults: (rules: ProfitAllocationRule[]) => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id' | 'asOf' | 'currency'>) => Promise<void>; updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>; deleteAsset: (id: string) => Promise<void>;
  addLiability: (liability: Omit<Liability, 'id' | 'asOf' | 'currency'>) => Promise<void>; updateLiability: (id: string, liability: Partial<Liability>) => Promise<void>; deleteLiability: (id: string) => Promise<void>;
  addHolding: (holding: Omit<InvestmentHolding, 'id'>) => Promise<void>; updateHolding: (id: string, holding: Partial<InvestmentHolding>) => Promise<void>; deleteHolding: (id: string) => Promise<void>;
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
  updateSettings: (section: keyof SettingsDTO, payload: Record<string, unknown>) => Promise<void>;
  toggleAccountStatus: (id: string) => Promise<void>;
}

const emptyProfile: BusinessProfile = { id: '', name: 'Local finance portal', type: '', abn: '', ownerName: '', email: '', currency: 'AUD', financialYearStartMonth: 7 };
const emptySettings: SettingsDTO = { importPreferences: { defaultImportSource: '', autoImport: true, deduplicate: true, defaultTaxRateBps: 2500 }, notifications: { weeklySummary: false, lowCashFlowAlert: true, transactionImportIssues: true, profitAllocationUpdated: true, marketing: false }, security: { twoFactorEnabled: false, activeSessions: 1 } };
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [businessProfile, setBusinessProfile] = useState(emptyProfile); const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); const [transactions, setTransactions] = useState<Transaction[]>([]); const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]); const [allocationRules, setAllocationRules] = useState<ProfitAllocationRule[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]); const [liabilities, setLiabilities] = useState<Liability[]>([]); const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [settings, setSettings] = useState(emptySettings); const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true); const [apiError, setApiError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false); const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const reportError = (error: unknown) => setApiError(error instanceof ApiError ? error.message : 'Không thể kết nối với dịch vụ tài chính cục bộ.');
  const refresh = useCallback(async () => { setIsLoading(true); setApiError(null); try { const s = await financeApi.snapshot(); setBusinessProfile(s.businessProfile); setConnectedAccounts(s.connectedAccounts); setCategories(s.categories); setTransactions(s.transactions); setImportJobs(s.importJobs); setCategoryRules(s.categoryRules); setAllocationRules(s.allocationRules); setAssets(s.assets); setLiabilities(s.liabilities); setHoldings(s.holdings); setSettings(s.settings); setActivityEvents(s.activityEvents); } catch (e) { reportError(e); } finally { setIsLoading(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const updateTransaction = async (id: string, patch: Partial<Transaction>) => { try { const updated = await financeApi.updateTransaction(id, patch); setTransactions(p => p.map(x => x.id === id ? updated : x)); } catch (e) { reportError(e); throw e; } };
  const bulkCategorizeTransactions = async (ids: string[], categoryId: string, scope: TransactionScope, includedInProfit: boolean) => { try { const updated = await financeApi.bulkCategorize(ids, categoryId, scope, includedInProfit); setTransactions(p => p.map(x => updated.find(u => u.id === x.id) ?? x)); } catch (e) { reportError(e); throw e; } };
  const markReviewed = async (id: string) => { try { const updated = await financeApi.markReviewed(id); setTransactions(p => p.map(x => x.id === id ? updated : x)); } catch (e) { reportError(e); throw e; } };
  const createCategoryRule = async (rule: Omit<CategoryRule, 'id'>) => { try { const created = await financeApi.createCategoryRule(rule); setCategoryRules(p => [...p, created]); } catch (e) { reportError(e); throw e; } };
  const updateCategoryRule = async (id: string, rule: Omit<CategoryRule, 'id'>) => { try { const updated = await financeApi.updateCategoryRule(id, rule); setCategoryRules(p => p.map(x => x.id === id ? updated : x)); } catch (e) { reportError(e); throw e; } };
  const deleteCategoryRule = async (id: string) => { try { await financeApi.deleteCategoryRule(id); setCategoryRules(p => p.filter(x => x.id !== id)); } catch (e) { reportError(e); throw e; } };
  const reRunCategoryRules = async () => { try { const result = await financeApi.reRunCategoryRules(); if (result.updated) setTransactions(result.updated); else await refresh(); } catch (e) { reportError(e); } };
  const uploadImport = async (file: File, sourceAccountId: string) => {
    try {
      const job = await financeApi.uploadImport(file, sourceAccountId);
      // Importing commits transactions server-side. Reload the canonical snapshot
      // so the ledger, dashboard, review queue and audit feed update together.
      await refresh();
      return job;
    } catch (e) { reportError(e); throw e; }
  };
  const saveAllocationDefaults = async (rules: ProfitAllocationRule[]) => { try { const saved = await financeApi.saveAllocationRules(rules); setAllocationRules(saved); } catch (e) { reportError(e); throw e; } };
  const addAsset = async (asset: Omit<Asset, 'id' | 'asOf' | 'currency'>) => { try { const created = await financeApi.addAsset(asset); setAssets(p => [...p, created]); } catch (e) { reportError(e); throw e; } };
  const updateAsset = async (id: string, asset: Partial<Asset>) => { try { const saved = await financeApi.updateAsset(id, asset); setAssets(p => p.map(x => x.id === id ? saved : x)); } catch (e) { reportError(e); throw e; } };
  const deleteAsset = async (id: string) => { try { await financeApi.deleteAsset(id); setAssets(p => p.filter(x => x.id !== id)); } catch (e) { reportError(e); throw e; } };
  const addLiability = async (liability: Omit<Liability, 'id' | 'asOf' | 'currency'>) => { try { const created = await financeApi.addLiability(liability); setLiabilities(p => [...p, created]); } catch (e) { reportError(e); throw e; } };
  const updateLiability = async (id: string, liability: Partial<Liability>) => { try { const saved = await financeApi.updateLiability(id, liability); setLiabilities(p => p.map(x => x.id === id ? saved : x)); } catch (e) { reportError(e); throw e; } };
  const deleteLiability = async (id: string) => { try { await financeApi.deleteLiability(id); setLiabilities(p => p.filter(x => x.id !== id)); } catch (e) { reportError(e); throw e; } };
  const addHolding = async (holding: Omit<InvestmentHolding, 'id'>) => { try { const created = await financeApi.addHolding(holding); setHoldings(p => [created, ...p]); } catch (e) { reportError(e); throw e; } };
  const updateHolding = async (id: string, holding: Partial<InvestmentHolding>) => { try { const saved = await financeApi.updateHolding(id, holding); setHoldings(p => p.map(x => x.id === id ? saved : x)); } catch (e) { reportError(e); throw e; } };
  const deleteHolding = async (id: string) => { try { await financeApi.deleteHolding(id); setHoldings(p => p.filter(x => x.id !== id)); } catch (e) { reportError(e); throw e; } };
  const updateBusinessProfile = async (profile: Partial<BusinessProfile>) => { try { setBusinessProfile(await financeApi.updateBusinessProfile(profile)); } catch (e) { reportError(e); throw e; } };
  const updateSettings = async (section: keyof SettingsDTO, payload: Record<string, unknown>) => { try { setSettings(await financeApi.updateSettings(section, payload)); } catch (e) { reportError(e); throw e; } };
  const toggleAccountStatus = async (id: string) => { const current = connectedAccounts.find(account => account.id === id); if (!current) return; try { const updated = await financeApi.updateAccountStatus(id, current.status !== 'connected'); setConnectedAccounts(accounts => accounts.map(account => account.id === id ? updated : account)); } catch (e) { reportError(e); throw e; } };
  const value = useMemo(() => ({ activeTab, setActiveTab, businessProfile, connectedAccounts, categories, transactions, importJobs, categoryRules, allocationRules, assets, liabilities, holdings, settings, activityEvents, isLoading, apiError, refresh, isSearchOpen, setIsSearchOpen, isNotificationsOpen, setIsNotificationsOpen, isAiAssistantOpen, setIsAiAssistantOpen, updateTransaction, bulkCategorizeTransactions, markReviewed, createCategoryRule, updateCategoryRule, deleteCategoryRule, reRunCategoryRules, uploadImport, saveAllocationDefaults, addAsset, updateAsset, deleteAsset, addLiability, updateLiability, deleteLiability, addHolding, updateHolding, deleteHolding, updateBusinessProfile, updateSettings, toggleAccountStatus }), [activeTab, businessProfile, connectedAccounts, categories, transactions, importJobs, categoryRules, allocationRules, assets, liabilities, holdings, settings, activityEvents, isLoading, apiError, refresh, isSearchOpen, isNotificationsOpen, isAiAssistantOpen]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};
export const useFinance = () => { const value = useContext(FinanceContext); if (!value) throw new Error('useFinance must be used within a FinanceProvider'); return value; };
