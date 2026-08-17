export type TransactionScope = 'business' | 'personal' | 'unknown';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type ReviewStatus = 'reviewed' | 'needs_review' | 'auto_categorized';
export type DuplicateStatus = 'clear' | 'suspected' | 'duplicate';

export interface BusinessProfile {
  id: string;
  name: string;
  type: string;
  abn: string;
  ownerName: string;
  email: string;
  currency: string;
  financialYearStartMonth: number;
}

export interface ConnectedAccount {
  id: string;
  provider: 'stripe' | 'xero' | 'bank' | string;
  displayName: string;
  status: 'connected' | 'syncing' | 'stale' | 'error' | 'disconnected';
  lastSyncedAt?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface TransactionCategorization {
  method: 'manual' | 'rule' | 'model' | 'none';
  ruleId?: string;
  confidence?: number;
}

export interface Transaction {
  id: string;
  occurredAt: string;
  description: string;
  merchant?: string;
  sourceAccountId: string;
  amountMinor: number; // e.g. 284215 = $2,842.15 AUD
  currency: string;
  type: TransactionType;
  scope: TransactionScope;
  categoryId: string;
  includedInProfit: boolean;
  reviewStatus: ReviewStatus;
  duplicateStatus: DuplicateStatus;
  categorization?: TransactionCategorization;
  createdAt?: string;
  updatedAt?: string;
}

export type ImportJobStatus =
  | 'uploaded'
  | 'validating'
  | 'mapping'
  | 'normalizing'
  | 'deduplicating'
  | 'categorizing'
  | 'review_required'
  | 'committed'
  | 'failed'
  | 'cancelled';

export interface ImportJob {
  id: string;
  sourceAccountId: string;
  fileName: string;
  fileHash: string;
  status: ImportJobStatus;
  progress: number; // 0 to 100
  uploadedAt: string;
  rowCount?: number;
  duplicateRows?: number;
  issuesCount?: number;
}

export interface CategoryRuleCondition {
  field: 'description' | 'merchant' | 'sourceAccountId' | 'amount';
  operator: 'contains' | 'equals' | 'starts_with';
  value: string;
}

export interface CategoryRuleAction {
  categoryId: string;
  scope: TransactionScope;
  includedInProfit: boolean;
}

export interface CategoryRule {
  id: string;
  priority: number;
  enabled: boolean;
  conditions: CategoryRuleCondition[];
  action: CategoryRuleAction;
}

export interface ProfitAllocationRule {
  id: string;
  name: string;
  percentageBps: number; // 3000 = 30.00%
  enabled: boolean;
  order: number;
}

export interface Asset {
  id: string;
  name: string;
  category: 'savings' | 'emergency_fund' | 'investments' | 'superannuation' | 'vehicle' | 'business_assets' | string;
  valueMinor: number;
  asOf: string;
  currency: string;
}

export interface Liability {
  id: string;
  name: string;
  category: 'home_loan' | 'credit_card' | 'personal_loan' | 'tax' | string;
  balanceMinor: number;
  asOf: string;
  currency: string;
}

export interface InvestmentHolding {
  id: string;
  name: string;
  category: 'etf' | 'shares' | 'super' | 'cash' | 'emergency' | 'growth' | 'passive_income' | string;
  currentValueMinor: number;
  monthlyContributionMinor?: number;
  returnMtdMinor?: number;
  annualReturnMinor?: number;
  asOf: string;
}

export interface SettingsDTO {
  importPreferences: {
    defaultImportSource: string;
    autoImport: boolean;
    deduplicate: boolean;
    defaultTaxRateBps: number;
  };
  notifications: {
    weeklySummary: boolean;
    lowCashFlowAlert: boolean;
    transactionImportIssues: boolean;
    profitAllocationUpdated: boolean;
    marketing: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    activeSessions: number;
  };
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'import' | 'transaction' | 'allocation' | 'system' | 'security';
  icon?: string;
}

export type ActiveTab =
  | 'overview'
  | 'imports'
  | 'transactions'
  | 'allocation'
  | 'cash-flow'
  | 'net-worth'
  | 'investments'
  | 'settings';
