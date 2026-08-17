import type {
  ActivityEvent, Asset, BusinessProfile, Category, CategoryRule, ConnectedAccount,
  ImportJob, InvestmentHolding, Liability, ProfitAllocationRule, SettingsDTO, Transaction,
} from '../types';

export interface FinanceSnapshot {
  businessProfile: BusinessProfile;
  connectedAccounts: ConnectedAccount[];
  categories: Category[];
  transactions: Transaction[];
  importJobs: ImportJob[];
  categoryRules: CategoryRule[];
  allocationRules: ProfitAllocationRule[];
  assets: Asset[];
  liabilities: Liability[];
  holdings: InvestmentHolding[];
  settings: SettingsDTO;
  activityEvents: ActivityEvent[];
}

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new ApiError(body?.message || body?.error || `Request failed (${response.status})`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// Kept in one adapter so the UI stays independent from the local server implementation.
export const financeApi = {
  snapshot: async (): Promise<FinanceSnapshot> => {
    const data = await request<FinanceSnapshot & { profile?: BusinessProfile; accounts?: ConnectedAccount[] }>('/bootstrap');
    return { ...data, businessProfile: data.businessProfile ?? data.profile!, connectedAccounts: data.connectedAccounts ?? data.accounts ?? [] };
  },
  updateTransaction: (id: string, patch: Partial<Transaction>) => request<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  bulkCategorize: (transactionIds: string[], categoryId: string, scope: Transaction['scope'], includedInProfit: boolean) =>
    request<Transaction[]>('/transactions/bulk-categorize', { method: 'POST', body: JSON.stringify({ transactionIds, categoryId, scope, includedInProfit }) }),
  markReviewed: (id: string) => request<Transaction>(`/transactions/${id}/review`, { method: 'POST' }),
  createCategoryRule: (rule: Omit<CategoryRule, 'id'>) => request<CategoryRule>('/category-rules', { method: 'POST', body: JSON.stringify(rule) }),
  updateCategoryRule: (id: string, rule: Omit<CategoryRule, 'id'>) => request<CategoryRule>(`/category-rules/${id}`, { method: 'PATCH', body: JSON.stringify(rule) }),
  deleteCategoryRule: (id: string) => request<void>(`/category-rules/${id}`, { method: 'DELETE' }),
  reRunCategoryRules: () => request<{ updated?: Transaction[] }>('/category-rules/apply', { method: 'POST' }),
  uploadImport: (file: File, sourceAccountId: string) => {
    const data = new FormData(); data.append('file', file); data.append('sourceAccountId', sourceAccountId);
    return request<ImportJob>('/imports', { method: 'POST', body: data });
  },
  getImport: (id: string) => request<ImportJob>(`/imports/${id}`),
  saveAllocationRules: (rules: ProfitAllocationRule[]) => request<ProfitAllocationRule[]>('/allocation-rules', { method: 'PATCH', body: JSON.stringify({ rules }) }),
  addAsset: (asset: Omit<Asset, 'id' | 'asOf' | 'currency'>) => request<Asset>('/assets', { method: 'POST', body: JSON.stringify(asset) }),
  updateAsset: (id: string, asset: Partial<Asset>) => request<Asset>(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(asset) }),
  deleteAsset: (id: string) => request<void>(`/assets/${id}`, { method: 'DELETE' }),
  addLiability: (liability: Omit<Liability, 'id' | 'asOf' | 'currency'>) => request<Liability>('/liabilities', { method: 'POST', body: JSON.stringify(liability) }),
  updateLiability: (id: string, liability: Partial<Liability>) => request<Liability>(`/liabilities/${id}`, { method: 'PATCH', body: JSON.stringify(liability) }),
  deleteLiability: (id: string) => request<void>(`/liabilities/${id}`, { method: 'DELETE' }),
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => request<BusinessProfile>('/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
  updateSettings: (section: keyof SettingsDTO, payload: Record<string, unknown>) => request<SettingsDTO>('/settings', { method: 'PATCH', body: JSON.stringify({ section, payload }) }),
  downloadBackup: () => { window.location.assign(`${API_BASE}/backups/export`); },
  restoreBackup: (file: File) => { const data = new FormData(); data.append('file', file); return request<{ restored: true; manifest: { createdAt: string } }>('/backups/restore', { method: 'POST', body: data }); },
  updateAccountStatus: (id: string, active: boolean) => request<ConnectedAccount>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  addHolding: (holding: Omit<InvestmentHolding, 'id'>) => request<InvestmentHolding>('/holdings', { method: 'POST', body: JSON.stringify(holding) }),
  updateHolding: (id: string, holding: Partial<InvestmentHolding>) => request<InvestmentHolding>(`/holdings/${id}`, { method: 'PATCH', body: JSON.stringify(holding) }),
  deleteHolding: (id: string) => request<void>(`/holdings/${id}`, { method: 'DELETE' }),
};
