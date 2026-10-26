const DAY = 86400000;

export function buildActionableInsights({ transactions = [], settings = {}, today }) {
  const now = new Date(`${today}T00:00:00Z`);
  const months = new Map();
  for (const item of transactions) {
    if (item?.type !== "expense" || !item.date || (item.tags || []).includes("Transfer")) continue;
    const month = String(item.date).slice(0, 7);
    months.set(month, (months.get(month) || 0) + Math.max(0, Number(item.amount) || 0));
  }
  const monthRows = [...months].sort(([a], [b]) => a.localeCompare(b));
  const latest = monthRows.at(-1), previous = monthRows.at(-2);
  const items = [];
  if (latest && previous && latest[1] > previous[1] * 1.15) items.push({ id: `spending-rise-${latest[0]}`, severity: "warning", title: "Spending rose materially", detail: `${latest[0]} spending is ${Math.round((latest[1] / previous[1] - 1) * 100)}% above ${previous[0]}.`, supportingFigures: { previous: previous[1], current: latest[1] }, dateRange: `${previous[0]} to ${latest[0]}`, action: "Review transactions", tab: "transactions" });
  const incomeMonths = new Map();
  for (const item of transactions) if (item?.type === "income" && item.date) { const month = String(item.date).slice(0, 7); incomeMonths.set(month, (incomeMonths.get(month) || 0) + Math.max(0, Number(item.amount) || 0)); }
  if (latest && previous) {
    const latestIncome = incomeMonths.get(latest[0]) || 0, previousIncome = incomeMonths.get(previous[0]) || 0;
    const currentRate = latestIncome > 0 ? (latestIncome - latest[1]) / latestIncome : null, previousRate = previousIncome > 0 ? (previousIncome - previous[1]) / previousIncome : null;
    if (currentRate !== null && previousRate !== null && currentRate < previousRate - 0.05) items.push({ id: `savings-rate-fall-${latest[0]}`, severity: "warning", title: "Savings rate fell", detail: `Savings rate moved from ${Math.round(previousRate * 100)}% to ${Math.round(currentRate * 100)}%.`, supportingFigures: { previousRate, currentRate }, dateRange: `${previous[0]} to ${latest[0]}`, action: "Review cash flow", tab: "review" });
  }
  const debt = (settings.netWorthAccounts || []).filter(item => item?.type === "liability" && Number(item.balance) > 0);
  if (debt.length) {
    const balance = debt.reduce((sum, item) => sum + Number(item.balance || 0), 0), payments = debt.reduce((sum, item) => sum + Number(item.minPayment || 0), 0);
    items.push({ id: "active-debt", severity: "info", title: "Extra payments could shorten debt payoff", detail: `${debt.length} liabilities total ${balance.toFixed(2)}, with ${payments.toFixed(2)} in recorded monthly payments.`, supportingFigures: { balance, payments }, dateRange: `As of ${today}`, action: "Compare repayment strategies", tab: "liabilities" });
  }
  const overdueGoals = (settings.goals || []).filter(goal => goal?.dueDate && goal.dueDate < today && Number(goal.current) < Number(goal.target));
  if (overdueGoals.length) items.push({ id: "overdue-goals", severity: "urgent", title: "A goal needs a new plan", detail: `${overdueGoals.length} goal${overdueGoals.length === 1 ? " is" : "s are"} past the target date.`, supportingFigures: { overdueGoals: overdueGoals.length }, dateRange: `As of ${today}`, action: "Review goals", tab: "goals" });
  const trailingExpenses = monthRows.slice(-3).map(([, value]) => value); const typicalSpend = trailingExpenses.length ? trailingExpenses.reduce((a, b) => a + b, 0) / trailingExpenses.length : 0;
  const liquid = (settings.netWorthAccounts || []).filter(item => item?.type === "asset" && item.category === "Cash & Bank").reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const emergencyTarget = Number(settings.emergencyFundMonths || 6);
  if (typicalSpend > 0 && liquid / typicalSpend < emergencyTarget) items.push({ id: "emergency-fund-low", severity: liquid < typicalSpend ? "urgent" : "warning", title: "Emergency fund is below target", detail: `${(liquid / typicalSpend).toFixed(1)} months are covered against a ${emergencyTarget}-month target.`, supportingFigures: { liquid, typicalSpend, coveredMonths: liquid / typicalSpend, targetMonths: emergencyTarget }, dateRange: `Trailing ${trailingExpenses.length} months through ${latest?.[0] || today.slice(0, 7)}`, action: "Review emergency goal", tab: "goals" });
  const currentMonth = today.slice(0, 7); const spentByCategory = new Map();
  for (const item of transactions) if (item?.type === "expense" && String(item.date).startsWith(currentMonth) && !(item.tags || []).includes("Transfer")) spentByCategory.set(item.category, (spentByCategory.get(item.category) || 0) + Number(item.amount || 0));
  for (const budget of settings.budgets || []) { const limit = Number(budget.limit || 0), spent = spentByCategory.get(budget.category) || 0; if (limit > 0 && spent > limit) items.push({ id: `budget-over-${budget.id || budget.category}-${currentMonth}`, severity: "warning", title: `${budget.category} is over budget`, detail: `${spent.toFixed(2)} spent against a ${limit.toFixed(2)} budget.`, supportingFigures: { spent, limit, overBy: spent - limit }, dateRange: currentMonth, action: "Review budget", tab: "budgets" }); }
  const next30 = new Date(now.getTime() + 30 * DAY).toISOString().slice(0, 10); const upcomingDebt = (settings.recurring || []).filter(item => item?.active !== false && item.type !== "income" && item.nextDate >= today && item.nextDate <= next30 && /loan|emi|mortgage/i.test(`${item.name || ""} ${item.category || ""}`));
  const expectedIncome = (settings.recurring || []).filter(item => item?.active !== false && item.type === "income" && item.nextDate >= today && item.nextDate <= next30).reduce((sum, item) => sum + Number(item.amount || 0), 0); const upcomingDebtTotal = upcomingDebt.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (upcomingDebtTotal > liquid + expectedIncome) items.push({ id: `emi-shortage-${today}`, severity: "urgent", title: "Upcoming EMIs may exceed available cash", detail: `${upcomingDebtTotal.toFixed(2)} is due in 30 days versus ${Number(liquid + expectedIncome).toFixed(2)} in current cash and scheduled income.`, supportingFigures: { upcomingDebtTotal, available: liquid + expectedIncome }, dateRange: `${today} to ${next30}`, action: "Open cash-flow forecast", tab: "review" });
  const maturityLimit = new Date(now.getTime() + 90 * DAY).toISOString().slice(0, 10); const maturing = debt.filter(item => item.endDate >= today && item.endDate <= maturityLimit);
  if (maturing.length) items.push({ id: `liability-maturity-${today}`, severity: "info", title: "A liability is approaching maturity", detail: `${maturing.length} liabilit${maturing.length === 1 ? "y matures" : "ies mature"} within 90 days.`, supportingFigures: { liabilities: maturing.length }, dateRange: `${today} to ${maturityLimit}`, action: "Review liability details", tab: "liabilities" });
  const dismissed = new Set(settings.dismissedFinancialInsights || []);
  const snoozed = settings.snoozedFinancialInsights || {};
  return items.filter(item => !dismissed.has(item.id) && (!snoozed[item.id] || new Date(`${snoozed[item.id]}T00:00:00Z`) <= now)).map(item => ({ ...item, generatedOn: today }));
}

export function dismissInsight(settings, id) {
  return { dismissedFinancialInsights: [...new Set([...(settings.dismissedFinancialInsights || []), id])] };
}

export function snoozeInsight(settings, id, today, days = 7) {
  const date = new Date(`${today}T00:00:00Z`); date.setTime(date.getTime() + Math.max(1, days) * DAY);
  return { snoozedFinancialInsights: { ...(settings.snoozedFinancialInsights || {}), [id]: date.toISOString().slice(0, 10) } };
}
