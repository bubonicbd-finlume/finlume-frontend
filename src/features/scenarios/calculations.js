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
    recurring: (Array.isArray(settings.recurring) ? settings.recurring : []).map(item => item?.type === "income" ? item : { ...item, amount: Number(item.amount) * (1 + spendingChange) }),
    subscriptions: (Array.isArray(settings.subscriptions) ? settings.subscriptions : []).map(item => ({ ...item, amount: Number(item.amount) * (1 + spendingChange) })) };
  const forecast = cashFlowForecast(adjustedSettings, adjustedTransactions, Number(opening) || 0, days, today, forecastOptions);
  const months = days / 30.4375;
  const ending = forecast.ending - (extraDebt + extraGoal) * months;
  const liability = (Array.isArray(settings.netWorthAccounts) ? settings.netWorthAccounts : []).find(account => account?.type === "liability" && Number(account.balance) > 0);
  const payoff = liability ? payoffProjection(liability, effectivePayment(liability, today) + extraDebt, today) : null;
  const goal = (Array.isArray(settings.goals) ? settings.goals : []).find(item => item && Number(item.target) > 0);
  const goalPlan = goal ? contributionPlan({ ...goal, plannedMonthly: Number(goal.plannedMonthly || 0) + extraGoal }, Number(goal.current) || 0, today) : null;
  return { ending, minimum: forecast.minBalance - (extraDebt + extraGoal) * months, incomeMonthly: forecast.incomeMonthly, otherMonthly: forecast.otherMonthly, recurringMonthly: forecast.recurringMonthly, payoffMonths: payoff?.neverPaysOff ? null : payoff?.months ?? null, goalProjected: goalPlan?.projected ?? null, assumptions: { incomePercent: incomeChange * 100, spendingPercent: spendingChange * 100, extraDebt, extraGoal } };
}

export function safeScenarioSummary(results, days) {
  const entries = results.map((result, index) => ({
    scenario: index === 0 ? "Current plan" : `Scenario ${index}`,
    days: bounded(days, 1, 365),
    projectedEnding: Number(result.ending.toFixed(2)),
    projectedMinimum: Number(result.minimum.toFixed(2)),
    payoffMonths: result.payoffMonths,
    goalProjected: result.goalProjected == null ? null : Number(result.goalProjected.toFixed(2)),
    assumptions: Object.fromEntries(["incomePercent", "spendingPercent", "extraDebt", "extraGoal"].map(key => [key, bounded(result.assumptions[key], key.includes("Percent") ? -100 : 0, key.includes("Percent") ? 300 : 1000000000)]))
  }));
  const summary = { title: "FinLume scenario comparison", note: "Estimates only. No transactions, balances or schedules were changed.", scenarios: entries };
  return JSON.stringify(summary, null, 2);
}
