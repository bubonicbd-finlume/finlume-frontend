import { cashFlowForecast } from "../financial-review/calculations.js";
import { effectivePayment, payoffProjection } from "../liabilities/calculations.js";
import { contributionPlan } from "../goals/calculations.js";

function bounded(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : 0;
}

export function compareScenario({ transactions, settings, today, opening, days, assumptions, forecastOptions = {} }) {
  const incomeChange = bounded(assumptions.incomePercent, -100, 300) / 100;
  const spendingChange = bounded(assumptions.spendingPercent, -100, 300) / 100;
  const extraDebt = bounded(assumptions.extraDebt, 0, 1000000000);
  const extraGoal = bounded(assumptions.extraGoal, 0, 1000000000);
  const adjustedTransactions = (transactions || []).map(item => item && ["income", "expense"].includes(item.type) ? { ...item, amount: Number(item.amount) * (1 + (item.type === "income" ? incomeChange : spendingChange)) } : item);
  const adjustedSettings = { ...settings,
    recurring: (Array.isArray(settings.recurring) ? settings.recurring : []).map(item => ({ ...item, amount: Number(item.amount) * (1 + (item?.type === "income" ? incomeChange : spendingChange)) })),
    subscriptions: (Array.isArray(settings.subscriptions) ? settings.subscriptions : []).map(item => ({ ...item, amount: Number(item.amount) * (1 + spendingChange) })) };
  const forecast = cashFlowForecast(adjustedSettings, adjustedTransactions, Number(opening) || 0, days, today, { ...forecastOptions, additionalMonthlyOutflow: extraDebt + extraGoal });
  const ending = forecast.ending;
  const accounts = Array.isArray(settings.netWorthAccounts) ? settings.netWorthAccounts : [];
  const liabilities = accounts.filter(account => account?.type === "liability" && Number(account.balance) > 0);
  const payoffRows = liabilities.map(account => payoffProjection(account, effectivePayment(account, today) + extraDebt / Math.max(1, liabilities.length), today));
  const payoff = payoffRows[0] || null;
  const goal = (Array.isArray(settings.goals) ? settings.goals : []).find(item => item && Number(item.target) > 0);
  const goalPlan = goal ? contributionPlan({ ...goal, plannedMonthly: Number(goal.plannedMonthly || 0) + extraGoal }, Number(goal.current) || 0, today) : null;
  const assets = accounts.filter(account => account?.type === "asset").reduce((sum, account) => sum + Math.max(0, Number(account.balance) || 0), 0);
  const debtBalance = liabilities.reduce((sum, account) => sum + Math.max(0, Number(account.balance) || 0), 0);
  const liquidAssets = accounts.filter(account => account?.type === "asset" && account.category === "Cash & Bank").reduce((sum, account) => sum + Math.max(0, Number(account.balance) || 0), 0);
  const horizonMonths = Math.max(1, Number(days) / 30.4375);
  const cashChange = ending - (Number(opening) || 0);
  const projectedNetWorth = assets - debtBalance + cashChange;
  const emergencyMonths = forecast.otherMonthly > 0 ? Math.max(0, liquidAssets + cashChange) / forecast.otherMonthly : null;
  const goalFundingPercent = goal && Number(goal.target) > 0 ? Math.min(100, (goalPlan?.projected || 0) / Number(goal.target) * 100) : null;
  const debtPaidEstimate = Math.min(debtBalance, liabilities.reduce((sum, account) => sum + (effectivePayment(account, today) + extraDebt / Math.max(1, liabilities.length)) * horizonMonths, 0));
  return { ending, minimum: forecast.minBalance, incomeMonthly: forecast.incomeMonthly, otherMonthly: forecast.otherMonthly, recurringMonthly: forecast.recurringMonthly, payoffMonths: payoff?.neverPaysOff ? null : payoff?.months ?? null, allDebtPayoffMonths: payoffRows.some(row => row.neverPaysOff) ? null : payoffRows.length ? Math.max(...payoffRows.map(row => row.months)) : null, projectedInterest: payoffRows.reduce((sum, row) => sum + Number(row.totalInterest || 0), 0), debtBalance, debtPaidEstimate, projectedNetWorth, emergencyMonths, goalProjected: goalPlan?.projected ?? null, goalFundingPercent, assumptions: { incomePercent: incomeChange * 100, spendingPercent: spendingChange * 100, extraDebt, extraGoal } };
}

export function safeScenarioSummary(results, days) {
  const entries = results.map((result, index) => ({
    scenario: index === 0 ? "Current plan" : `Scenario ${index}`,
    days: bounded(days, 1, 365),
    projectedEnding: Number(result.ending.toFixed(2)),
    projectedMinimum: Number(result.minimum.toFixed(2)),
    payoffMonths: result.payoffMonths,
    goalProjected: result.goalProjected == null ? null : Number(result.goalProjected.toFixed(2)),
    projectedNetWorth: Number(result.projectedNetWorth.toFixed(2)),
    emergencyMonths: result.emergencyMonths == null ? null : Number(result.emergencyMonths.toFixed(2)),
    debtPaidEstimate: Number(result.debtPaidEstimate.toFixed(2)),
    assumptions: Object.fromEntries(["incomePercent", "spendingPercent", "extraDebt", "extraGoal"].map(key => [key, bounded(result.assumptions[key], key.includes("Percent") ? -100 : 0, key.includes("Percent") ? 300 : 1000000000)]))
  }));
  const summary = { title: "FinLume scenario comparison", note: "Estimates only. No transactions, balances or schedules were changed.", scenarios: entries };
  return JSON.stringify(summary, null, 2);
}
