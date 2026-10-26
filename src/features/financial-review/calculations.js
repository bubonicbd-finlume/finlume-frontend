import { monthlyEquivalent as defaultMonthlyEquivalent, uniqueSchedules } from "../recurring/calculations.js";

const DAYS_PER_MONTH = 30.4375;

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function formatDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDays(value, days) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function addMonths(value, months, anchorDay) {
  const [year, month, day] = String(value).split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(anchorDay || day, lastDay));
  return formatDate(target);
}

export function nextScheduledDate(value, cadence, intervalDays, anchorDay) {
  if (cadence === "daily") return addDays(value, 1);
  if (cadence === "custom") return addDays(value, Math.max(1, Math.floor(Number(intervalDays) || 1)));
  if (cadence === "weekly") return addDays(value, 7);
  if (cadence === "biweekly" || cadence === "fortnightly") return addDays(value, 14);
  if (cadence === "quarterly") return addMonths(value, 3, anchorDay);
  if (cadence === "half-yearly" || cadence === "semiannual") return addMonths(value, 6, anchorDay);
  if (cadence === "annual" || cadence === "yearly") return addMonths(value, 12, anchorDay);
  return addMonths(value, 1, anchorDay);
}

export function pastMonthKeys(today, count = 3) {
  const [year, month] = String(today).split("-").map(Number);
  const result = [];
  for (let index = 1; index <= count; index++) {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    result.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

export function averageMonthlyIncome(transactions, today, options = {}) {
  const isSelfTransfer = options.isSelfTransfer || (() => false);
  const isRefund = options.isRefund || (() => false);
  const values = pastMonthKeys(today, 3).map(month => (transactions || []).reduce((sum, transaction) => {
    if (!transaction?.date?.startsWith(month) || transaction.type !== "income") return sum;
    if (isSelfTransfer(transaction) || isRefund(transaction)) return sum;
    return sum + number(transaction.amount);
  }, 0));
  const usable = values.filter(value => value > 0);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
}

export function expenseForecast(transactions, settings, today, options = {}) {
  const isSelfTransfer = options.isSelfTransfer || (() => false);
  const isRefund = options.isRefund || (() => false);
  const normalizeMerchant = options.normalizeMerchant || (value => String(value || "").trim().toLowerCase());
  const monthlyEquivalent = options.monthlyEquivalent || defaultMonthlyEquivalent;
  const recurringItems = uniqueSchedules(settings).filter(item => item.active !== false && item.type !== "income" && item.kind !== "income");
  const recurringTotal = recurringItems.reduce((sum, item) => sum + monthlyEquivalent(item.amount, item.cadence, item.intervalDays), 0);
  const recurringMerchants = new Set(recurringItems.map(item => normalizeMerchant(item.name)).filter(Boolean));
  let otherTotal = 0;
  let monthsWithData = 0;
  const otherByCategory = new Map();

  for (const month of pastMonthKeys(today, 3)) {
    const monthTransactions = (transactions || []).filter(transaction => transaction?.date?.startsWith(month));
    if (!monthTransactions.length) continue;
    monthsWithData++;
    for (const transaction of monthTransactions) {
      if (isSelfTransfer(transaction) || transaction.type !== "expense") continue;
      const normalized = normalizeMerchant(transaction.merchant);
      if ([...recurringMerchants].some(merchant => normalized.includes(merchant))) continue;
      const amount = isRefund(transaction) ? -number(transaction.amount) : number(transaction.amount);
      otherTotal += amount;
      const category = transaction.category || "Needs review";
      otherByCategory.set(category, (otherByCategory.get(category) || 0) + amount);
    }
  }

  const otherAvg = monthsWithData ? otherTotal / monthsWithData : 0;
  const otherAvgByCategory = [...otherByCategory.entries()]
    .map(([name, total]) => ({ name, value: total / (monthsWithData || 1) }))
    .filter(category => category.value > 0)
    .sort((a, b) => b.value - a.value);
  const upcomingBills = recurringItems.filter(item => item.nextDate).sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 10);
  return { recurringTotal, otherAvg, total: recurringTotal + otherAvg, upcomingBills, otherAvgByCategory, hasData: recurringItems.length > 0 || monthsWithData > 0 };
}

export function cashFlowForecast(settings, transactions, opening, days, today, options = {}) {
  const scheduledIncome = uniqueSchedules(settings).filter(item => item.active !== false && (item.type === "income" || item.kind === "income"));
  const incomeNames = new Set(scheduledIncome.map(item => String(item.linkMerchant || item.name || "").trim().toLowerCase()).filter(Boolean));
  const historicalIncome = incomeNames.size ? (transactions || []).filter(item => !incomeNames.has(String(item.merchant || "").trim().toLowerCase())) : transactions;
  const incomeMonthly = averageMonthlyIncome(historicalIncome, today, options);
  const expenses = expenseForecast(transactions, settings, today, options);
  const dailyIncome = incomeMonthly / DAYS_PER_MONTH;
  const dailyOther = expenses.otherAvg / DAYS_PER_MONTH;
  const end = addDays(today, days);
  const events = [];

  for (const item of uniqueSchedules(settings).filter(entry => entry.active !== false && /^\d{4}-\d{2}-\d{2}$/.test(entry.nextDate || ""))) {
    let date = item.nextDate;
    let guard = 0;
    while (date < today && guard++ < 10000) date = nextScheduledDate(date, item.cadence, item.intervalDays, item.anchorDay);
    while (date >= today && date <= end && (!item.endDate || date <= item.endDate) && guard++ < 11000) {
      if (item.startDate && date < item.startDate) { date = nextScheduledDate(date, item.cadence, item.intervalDays, item.anchorDay); continue; }
      events.push({ date, name: item.name, amount: number(item.amount), kind: item.kind || "recurring", type: item.type === "income" || item.kind === "income" ? "income" : "expense" });
      date = nextScheduledDate(date, item.cadence, item.intervalDays, item.anchorDay);
    }
  }
  const additional = Math.max(0, number(options.additionalMonthlyOutflow));
  if (additional > 0) {
    for (let month = 1; month <= 12; month++) {
      const date = addMonths(today, month);
      if (date > end) break;
      events.push({ date, name: "Scenario: extra debt and goal contributions", amount: additional, kind: "scenario", type: "expense" });
    }
  }
  const eventSignature = event => `${event.date}|${event.type}|${Math.round(number(event.amount) * 100)}|${String(event.name || "").trim().toLowerCase()}`;
  const eventSignatures = new Set(events.map(eventSignature));
  const addProjected = event => { const signature = eventSignature(event); if (!eventSignatures.has(signature) && event.date >= today && event.date <= end) { eventSignatures.add(signature); events.push(event); } };
  const monthlyPlans = [
    ...(settings.goals || []).filter(item => item.status !== "Paused" && item.status !== "Completed" && number(item.plannedMonthly) > 0).map(item => ({ name: `${item.name || "Goal"} contribution`, amount: number(item.plannedMonthly), kind: "goal" })),
    ...(settings.investments || []).filter(item => number(item.monthlyContribution ?? item.sipAmount) > 0).map(item => ({ name: `${item.name || "Investment"} contribution`, amount: number(item.monthlyContribution ?? item.sipAmount), kind: "investment" })),
    ...(settings.savingsInstruments || []).filter(item => number(item.monthlyContribution) > 0).map(item => ({ name: `${item.name || "Savings"} contribution`, amount: number(item.monthlyContribution), kind: "savings" }))
  ];
  for (let month = 1; month <= Math.ceil(days / DAYS_PER_MONTH); month++) for (const plan of monthlyPlans) addProjected({ date: addMonths(today, month), name: plan.name, amount: plan.amount, kind: plan.kind, type: "expense" });
  for (const obligation of settings.datesToRemember || []) if (obligation?.active !== false && /^\d{4}-\d{2}-\d{2}$/.test(obligation.date || obligation.dueDate || "") && number(obligation.amount) > 0) addProjected({ date: obligation.date || obligation.dueDate, name: obligation.name || "One-time obligation", amount: number(obligation.amount), kind: "obligation", type: obligation.category === "income" ? "income" : "expense" });
  for (const account of settings.netWorthAccounts || []) if (account?.type === "liability" && number(account.balance) > 0 && number(account.paymentDueDay) > 0) {
    for (let month = 0; month <= Math.ceil(days / DAYS_PER_MONTH); month++) {
      const base = addMonths(today, month, Number(account.paymentDueDay));
      const paymentDate = `${base.slice(0, 8)}${String(Math.min(Number(account.paymentDueDay), new Date(Date.UTC(Number(base.slice(0, 4)), Number(base.slice(5, 7)), 0)).getUTCDate())).padStart(2, "0")}`;
      addProjected({ date: paymentDate, name: account.name || "Liability payment", amount: number(account.minPayment), kind: "liability", type: "expense" });
    }
  }

  const scheduledByDate = new Map();
  for (const event of events) {
    const entry = scheduledByDate.get(event.date) || { income: 0, expense: 0 };
    entry[event.type] += event.amount;
    scheduledByDate.set(event.date, entry);
  }
  let balance = number(opening);
  let minBalance = balance;
  let totalIncome = 0;
  let totalOther = 0;
  let totalScheduled = 0;
  const points = [];

  for (let index = 0; index <= days; index++) {
    const date = addDays(today, index);
    const scheduled = scheduledByDate.get(date) || { income: 0, expense: 0 };
    balance += dailyIncome + scheduled.income - dailyOther - scheduled.expense;
    totalIncome += dailyIncome + scheduled.income;
    totalOther += dailyOther;
    totalScheduled += scheduled.expense;
    minBalance = Math.min(minBalance, balance);
    if (index % 7 === 0 || index === days) {
      const displayDate = parseDate(date);
      points.push({ date, label: displayDate.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }), balance });
    }
  }

  return {
    points,
    events: events.sort((a, b) => a.date.localeCompare(b.date)),
    ending: balance,
    minBalance,
    totalIncome,
    totalOther,
    totalScheduled,
    incomeMonthly,
    otherMonthly: expenses.otherAvg,
    recurringMonthly: expenses.recurringTotal,
    monthlyBreakdown: [...events.reduce((map, event) => { const key = event.date.slice(0, 7), row = map.get(key) || { month: key, income: 0, expenses: 0 }; row[event.type === "income" ? "income" : "expenses"] += event.amount; map.set(key, row); return map; }, new Map()).values()].sort((a, b) => a.month.localeCompare(b.month)),
    shortageDates: points.filter(point => point.balance < 0).map(point => point.date)
  };
}
