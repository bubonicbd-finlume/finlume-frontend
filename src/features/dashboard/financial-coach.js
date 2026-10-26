import React from "react";

const CASH_CATEGORIES = new Set(["Cash", "Cash & Bank", "Bank Account", "Savings Account"]);
const ESSENTIAL_CATEGORIES = new Set(["Housing", "Groceries", "Utilities", "Insurance", "Health", "Transportation"]);
const positive = value => Math.max(0, Number(value) || 0);

function monthBefore(month) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 2, 1));
  return date.toISOString().slice(0, 7);
}

function monthTotals(transactions, month) {
  return (transactions || []).reduce((total, item) => {
    if (item?.date?.slice(0, 7) !== month || item.tags?.includes("Transfer")) return total;
    const amount = positive(item.amount);
    if (item.tags?.includes("Refund")) total.spending -= amount;
    else if (item.type === "income") total.income += amount;
    else if (item.type === "expense") {
      total.spending += amount;
      if (ESSENTIAL_CATEGORIES.has(item.category)) total.essential += amount;
    }
    return total;
  }, { income: 0, spending: 0, essential: 0 });
}

export function buildFinancialPlan(transactions = [], settings = {}, today = new Date().toISOString().slice(0, 10), formatAmount = amount => String(Math.round(amount))) {
  const currentMonth = today.slice(0, 7);
  const lastMonth = monthBefore(currentMonth);
  const previousMonth = monthBefore(lastMonth);
  const recent = monthTotals(transactions, lastMonth);
  const previous = monthTotals(transactions, previousMonth);
  const todayNumber = Date.parse(`${today}T00:00:00Z`) / 86400000;
  const weekly = (transactions || []).reduce((total, item) => {
    const day = Date.parse(`${item?.date || ""}T00:00:00Z`) / 86400000;
    if (!Number.isFinite(day) || day > todayNumber || day <= todayNumber - 14 || item.tags?.includes("Transfer")) return total;
    const key = day > todayNumber - 7 ? "recent" : "previous";
    if (item.type === "expense") total[key] += item.tags?.includes("Refund") ? -positive(item.amount) : positive(item.amount);
    return total;
  }, { recent: 0, previous: 0 });
  const accounts = Array.isArray(settings.netWorthAccounts) ? settings.netWorthAccounts : [];
  const cash = accounts.filter(account => account.type === "asset" && CASH_CATEGORIES.has(account.category)).reduce((sum, account) => sum + positive(account.balance), 0);
  const liabilities = accounts.filter(account => account.type === "liability" && positive(account.balance) > 0);
  const goals = Array.isArray(settings.goals) ? settings.goals : [];
  const targetMonths = Math.min(12, Math.max(1, Number(settings.emergencyTargetMonths) || 3));
  const essentialBase = recent.essential || (recent.spending > 0 ? recent.spending : 0);
  const emergencyTarget = essentialBase * targetMonths;
  const actions = [];
  if (recent.income > 0 && recent.spending > recent.income) actions.push({ id: "deficit", priority: 1, title: "Review last month's deficit", detail: `Spending exceeded income by ${formatAmount(recent.spending - recent.income)} in ${lastMonth}.`, tab: "transactions" });
  if (essentialBase > 0 && cash < emergencyTarget) actions.push({ id: "emergency", priority: 2, title: "Build your cash buffer", detail: `Saved cash covers ${(cash / essentialBase).toFixed(1)} months of the selected spending base; your ${targetMonths}-month target is ${formatAmount(emergencyTarget)}.`, tab: "wealth" });
  if (liabilities.length) {
    const highest = [...liabilities].sort((a, b) => positive(b.interestRate) - positive(a.interestRate))[0];
    actions.push({ id: "debt", priority: positive(highest.interestRate) > 0 ? 3 : 5, title: "Review your debt plan", detail: `${highest.name || "A liability"} has ${formatAmount(positive(highest.balance))} outstanding${positive(highest.interestRate) ? ` at ${highest.interestRate}% yearly interest` : ""}. Compare payoff options before making extra payments.`, tab: "liabilities" });
  }
  const unfunded = goals.filter(goal => goal.status !== "Completed" && positive(goal.target) > positive(goal.current));
  if (unfunded.length) {
    const next = [...unfunded].sort((a, b) => String(a.targetDate || a.dueDate || "9999").localeCompare(String(b.targetDate || b.dueDate || "9999")))[0];
    actions.push({ id: "goal", priority: 4, title: "Check goal funding", detail: `${next.name || "A goal"} needs ${formatAmount(positive(next.target) - positive(next.current))} more against its saved target.`, tab: "wealth" });
  }
  if (recent.income > 0 && recent.spending <= recent.income && !actions.length) actions.push({ id: "maintain", priority: 6, title: "Maintain your current plan", detail: `${lastMonth} had ${formatAmount(recent.income - recent.spending)} of recorded surplus. Review categories and upcoming commitments before assigning it.`, tab: "review" });
  const hasInsuranceRecord = (transactions || []).some(item => item?.category === "Insurance" && item.type === "expense") || [...(settings.recurring || []), ...(settings.subscriptions || [])].some(item => item?.category === "Insurance");
  if (!hasInsuranceRecord && ((transactions || []).length || (settings.recurring || []).length || (settings.subscriptions || []).length)) actions.push({ id: "insurance", priority: 5, title: "Review insurance details", detail: "No insurance payment is identified in saved transactions or schedules. Check coverage outside Finlume before drawing conclusions.", tab: "transactions" });
  const hasRetirementPlan = (settings.investments || []).some(item => item?.purpose === "Retirement") || goals.some(goal => /retire/i.test(String(goal?.name || "")));
  if (!hasRetirementPlan && ((settings.investments || []).length || goals.length)) actions.push({ id: "retirement", priority: 6, title: "Review retirement planning", detail: "No saved holding or goal is marked for retirement. Add or label one if you track it here.", tab: "investments" });
  actions.sort((a, b) => a.priority - b.priority);
  const change = previous.spending > 0 ? (recent.spending - previous.spending) / previous.spending * 100 : null;
  return { period: lastMonth, previousPeriod: previousMonth, recent, previous, weekly, cash, emergencyTarget, targetMonths, change, actions, hasHistory: (transactions || []).some(item => item?.date?.slice(0, 7) === lastMonth) };
}

export function FinancialCoachPanel({ transactions, settings, onGoTo, onSaveSettings, Card, formatCurrency, today }) {
  const [expanded, setExpanded] = React.useState(false);
  const plan = React.useMemo(() => buildFinancialPlan(transactions, settings, today, formatCurrency), [transactions, settings, today, formatCurrency]);
  const format = amount => formatCurrency(amount);
  return React.createElement(Card, { className: "p-5" },
    React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-3" }, React.createElement("div", null,
      React.createElement("h2", { className: "text-[15px] font-semibold text-slate-800" }, "Financial plan & weekly coach"),
      React.createElement("p", { className: "text-[12px] text-slate-500 mt-1" }, "Priorities calculated from your saved balances, goals, and completed-month transactions.")),
      React.createElement("label", { className: "text-[12px] text-slate-600" }, "Cash buffer target ", React.createElement("select", { className: "ml-1 h-10 rounded-lg border border-slate-300 px-2", value: plan.targetMonths, onChange: event => onSaveSettings({ emergencyTargetMonths: Number(event.target.value) }) }, [3, 6, 9, 12].map(months => React.createElement("option", { key: months, value: months }, `${months} months`))))),
    plan.hasHistory ? React.createElement("p", { className: "text-[12.5px] text-slate-600 mt-3" }, `${plan.period}: ${format(plan.recent.income)} income, ${format(plan.recent.spending)} spending${plan.change == null ? "" : `; spending ${Math.abs(plan.change).toFixed(0)}% ${plan.change >= 0 ? "higher" : "lower"} than ${plan.previousPeriod}`}.`) : React.createElement("p", { className: "text-[12.5px] text-slate-500 mt-3" }, "Add a completed month of transactions to receive a spending summary."),
    React.createElement("p", { className: "text-[12px] text-slate-500 mt-1" }, `Last 7 days: ${format(plan.weekly.recent)} recorded spending; preceding 7 days: ${format(plan.weekly.previous)}.`),
    plan.actions.length ? React.createElement("ol", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 mt-3" }, (expanded ? plan.actions : plan.actions.slice(0, 4)).map((action, index) => React.createElement("li", { key: action.id, className: "rounded-xl border border-slate-200 bg-slate-50 p-3" }, React.createElement("p", { className: "text-[13px] font-semibold text-slate-800" }, `${index + 1}. ${action.title}`), React.createElement("p", { className: "text-[12px] text-slate-600 mt-1" }, action.detail), React.createElement("button", { type: "button", onClick: () => onGoTo(action.tab), className: "min-h-10 text-[12px] font-semibold text-indigo-700 underline" }, "Review details")))) : React.createElement("p", { className: "text-[12px] text-slate-500 mt-3" }, "Add cash balances, goals, liabilities, or transactions to generate a plan."),
    plan.actions.length > 4 && React.createElement("button", { type: "button", onClick: () => setExpanded(value => !value), className: "min-h-10 text-[12px] font-semibold text-indigo-700 underline" }, expanded ? "Show fewer actions" : `Show all ${plan.actions.length} actions`),
    React.createElement("p", { className: "text-[11px] text-slate-400 mt-3" }, "Amounts are in your selected display currency. This is a planning summary, not a prediction or investment recommendation."));
}
