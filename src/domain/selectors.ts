export function selectLatestTransactionMonth(transactions: Transaction[]): string | null {
  return transactions.map((t) => t.occurredAt.slice(0, 7)).sort().at(-1) ?? null;
}

export function selectMonth(transactions: Transaction[], month: string | null): Transaction[] {
  return month ? transactions.filter((t) => t.occurredAt.startsWith(month)) : transactions;
}

export function financialYearLabel(month: string | null, startMonth = 7): string {
  const year = month ? Number(month.slice(0, 4)) : new Date().getFullYear();
  const monthNumber = month ? Number(month.slice(5, 7)) : new Date().getMonth() + 1;
  const startYear = monthNumber >= startMonth ? year : year - 1;
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}

function monthly(transactions: Transaction[], month?: string | null): Transaction[] {
  return selectMonth(transactions, month ?? null);
}

import {
  Transaction,
  Asset,
  Liability,
  InvestmentHolding,
  ProfitAllocationRule,
  Category,
} from '../types';

export function selectTotalBusinessIncome(transactions: Transaction[], month?: string | null): number {
  return monthly(transactions, month)
    .filter((t) => t.type === 'income' && t.scope === 'business' && t.includedInProfit && t.duplicateStatus !== 'duplicate')
    .reduce((sum, t) => sum + Math.abs(t.amountMinor), 0);
}

export function selectStripeIncome(transactions: Transaction[], month?: string | null): number {
  return monthly(transactions, month)
    .filter(
      (t) =>
        t.type === 'income' &&
        t.scope === 'business' &&
        t.sourceAccountId === 'stripe' &&
        t.includedInProfit &&
        t.duplicateStatus !== 'duplicate'
    )
    .reduce((sum, t) => sum + Math.abs(t.amountMinor), 0);
}

export function selectEmploymentIncome(transactions: Transaction[], month?: string | null): number {
  return monthly(transactions, month)
    .filter((t) => t.type === 'income' && t.scope === 'personal' && t.duplicateStatus !== 'duplicate')
    .reduce((sum, t) => sum + Math.abs(t.amountMinor), 0);
}

export function selectBusinessExpenses(transactions: Transaction[], month?: string | null): number {
  return monthly(transactions, month)
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.scope === 'business' &&
        t.includedInProfit &&
        t.duplicateStatus !== 'duplicate'
    )
    .reduce((sum, t) => sum + Math.abs(t.amountMinor), 0);
}

export function selectNetProfit(transactions: Transaction[], month?: string | null): number {
  const income = selectTotalBusinessIncome(transactions, month);
  const expenses = selectBusinessExpenses(transactions, month);
  return income - expenses;
}

export function selectTaxReserve(transactions: Transaction[], taxBps: number = 2500, month?: string | null): number {
  const netProfit = selectNetProfit(transactions, month);
  if (netProfit <= 0) return 0;
  return Math.round((netProfit * taxBps) / 10000);
}

export function selectNeedsReviewCount(transactions: Transaction[]): number {
  return transactions.filter((t) => t.reviewStatus === 'needs_review').length;
}

export function selectCategoryBreakdown(transactions: Transaction[], categories: Category[]): Array<{ categoryId: string; name: string; amountMinor: number; count: number; percentage: number }> {
  const categoryMap = new Map<string, { amount: number; count: number }>();

  let totalExpenses = 0;
  transactions
    .filter((t) => t.type === 'expense' && t.scope === 'business' && t.includedInProfit && t.duplicateStatus !== 'duplicate')
    .forEach((t) => {
      const catId = t.categoryId || 'cat_uncategorized';
      const absAmt = Math.abs(t.amountMinor);
      totalExpenses += absAmt;
      const current = categoryMap.get(catId) || { amount: 0, count: 0 };
      categoryMap.set(catId, { amount: current.amount + absAmt, count: current.count + 1 });
    });

  return Array.from(categoryMap.entries()).map(([catId, data]) => {
    const catObj = categories.find((c) => c.id === catId);
    return {
      categoryId: catId,
      name: catObj ? catObj.name : 'Uncategorized',
      amountMinor: data.amount,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    };
  }).sort((a, b) => b.amountMinor - a.amountMinor);
}

export function selectCalculatedAllocations(
  netProfitMinor: number,
  rules: ProfitAllocationRule[]
): Array<{ ruleId: string; name: string; percentageBps: number; amountMinor: number; enabled: boolean }> {
  const availableProfit = Math.max(0, netProfitMinor);
  const enabledRules = rules.filter((rule) => rule.enabled);
  const totalBps = enabledRules.reduce((sum, rule) => sum + rule.percentageBps, 0);
  const amounts = new Map<string, number>();
  const provisional = enabledRules.map((rule, index) => {
    const numerator = availableProfit * rule.percentageBps;
    return { rule, index, amountMinor: Math.floor(numerator / 10000), remainder: numerator % 10000 };
  });
  let remainder = totalBps === 10000
    ? availableProfit - provisional.reduce((sum, row) => sum + row.amountMinor, 0)
    : 0;
  provisional.sort((a, b) => b.remainder - a.remainder || a.rule.order - b.rule.order || a.index - b.index);
  for (let index = 0; remainder > 0 && provisional.length; index = (index + 1) % provisional.length, remainder -= 1) {
    provisional[index].amountMinor += 1;
  }
  provisional.forEach((row) => amounts.set(row.rule.id, row.amountMinor));
  return rules.map((r) => ({
    ruleId: r.id,
    name: r.name,
    percentageBps: r.percentageBps,
    amountMinor: amounts.get(r.id) ?? 0,
    enabled: r.enabled,
  }));
}

export function selectTotalAssets(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + a.valueMinor, 0);
}

export function selectTotalLiabilities(liabilities: Liability[]): number {
  return liabilities.reduce((sum, l) => sum + l.balanceMinor, 0);
}

export function selectNetWorth(assets: Asset[], liabilities: Liability[]): number {
  return selectTotalAssets(assets) - selectTotalLiabilities(liabilities);
}

export function selectPortfolioValue(holdings: InvestmentHolding[]): number {
  return holdings.reduce((sum, h) => sum + h.currentValueMinor, 0);
}

export function selectTotalMonthlyContributions(holdings: InvestmentHolding[]): number {
  return holdings.reduce((sum, h) => sum + (h.monthlyContributionMinor || 0), 0);
}

export function selectMtdPassiveIncome(holdings: InvestmentHolding[]): number {
  const passive = holdings.find((h) => h.category === 'passive_income');
  return passive?.returnMtdMinor ?? 0;
}

export function selectLiquidAssets(assets: Asset[]): number {
  const liquidCategories = new Set(['savings', 'emergency_fund', 'cash']);
  return assets.filter((asset) => liquidCategories.has(asset.category)).reduce((sum, asset) => sum + asset.valueMinor, 0);
}
