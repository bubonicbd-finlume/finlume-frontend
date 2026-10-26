import { financialHealthTrend } from "../dashboard/health-score.js";
import { cashFlowSummary } from "../../finance/engine.js";

const sum = (items, pick) => items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);

export function filterReportTransactions(transactions = [], filters = {}) {
  return transactions.filter(item => (!filters.start || item.date >= filters.start) && (!filters.end || item.date <= filters.end) && (!filters.account || item.account === filters.account) && (!filters.category || item.category === filters.category));
}

export function transactionReportSummary(transactions = [], settings = {}) {
  const flow = cashFlowSummary(transactions);
  const { income, expenses } = flow;
  const byCategory = new Map();
  for (const item of transactions) if (item.type === "expense" && !(item.tags || []).includes("Transfer")) byCategory.set(item.category || "Other", (byCategory.get(item.category || "Other") || 0) + Number(item.amount || 0));
  const budgetActual = (settings.budgets || []).map(budget => ({ category: budget.category, budget: Number(budget.limit) || 0, actual: byCategory.get(budget.category) || 0 }));
  return { income, expenses, cashFlow: flow.net, savingsRate: flow.savingsRate, byCategory: [...byCategory].sort((a, b) => b[1] - a[1]), budgetActual };
}

export function financialIntelligenceReport(transactions = [], settings = {}) {
  const accounts = Array.isArray(settings.netWorthAccounts) ? settings.netWorthAccounts : [];
  const liabilities = accounts.filter(item => item?.type === "liability");
  const assets = accounts.filter(item => item?.type === "asset");
  const investments = Array.isArray(settings.investments) ? settings.investments : [];
  const subscriptions = Array.isArray(settings.subscriptions) ? settings.subscriptions.filter(item => item?.active !== false) : [];
  const goals = Array.isArray(settings.goals) ? settings.goals.filter(item => Number(item?.target) > 0) : [];
  const history = Array.isArray(settings.netWorthHistory) ? [...settings.netWorthHistory].sort((a, b) => String(a.month).localeCompare(String(b.month))) : [];
  const first = history[0];
  const last = history.at(-1);
  const totalGoalTarget = sum(goals, item => item.target);
  const totalGoalSaved = sum(goals, item => item.current);
  const liquidAssets = sum(assets.filter(item => item.category === "Cash & Bank"), item => item.balance);
  return {
    debt: { balance: sum(liabilities, item => item.balance), accounts: liabilities.length, monthlyPayment: sum(liabilities, item => item.minPayment) },
    netWorth: { current: sum(assets, item => item.balance) + sum(investments, item => item.currentValue) - sum(liabilities, item => item.balance), change: first && last ? Number(last.netWorth || 0) - Number(first.netWorth || 0) : null, points: history.length },
    goals: { funded: totalGoalSaved, target: totalGoalTarget, percent: totalGoalTarget > 0 ? Math.min(100, totalGoalSaved / totalGoalTarget * 100) : null, count: goals.length },
    portfolio: { value: sum(investments, item => item.currentValue), cost: sum(investments, item => item.costBasis), holdings: investments.length },
    subscriptions: { active: subscriptions.length, monthly: sum(subscriptions, item => item.monthlyAmount ?? item.amount) },
    health: financialHealthTrend({ transactions, liquidAssets, monthlyDebt: sum(liabilities, item => item.minPayment), goals, months: 12 })
  };
}

export function intelligenceReportCsv(report, transactionSummary) {
  const rows = [
    ["Section", "Metric", "Value"], ["Debt", "Balance", report.debt.balance], ["Debt", "Monthly payment", report.debt.monthlyPayment],
    ["Net worth", "Current", report.netWorth.current], ["Net worth", "Change", report.netWorth.change ?? ""],
    ["Goals", "Funded", report.goals.funded], ["Goals", "Target", report.goals.target], ["Portfolio", "Value", report.portfolio.value],
    ["Portfolio", "Cost", report.portfolio.cost], ["Subscriptions", "Active", report.subscriptions.active], ["Subscriptions", "Monthly", report.subscriptions.monthly]
  ];
  if (transactionSummary) rows.push(["Cash flow", "Income", transactionSummary.income], ["Cash flow", "Expenses", transactionSummary.expenses], ["Cash flow", "Net", transactionSummary.cashFlow], ...transactionSummary.byCategory.map(([category, value]) => ["Category", category, value]), ...transactionSummary.budgetActual.map(row => ["Budget versus actual", row.category, `${row.budget} / ${row.actual}`]));
  return rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
}
