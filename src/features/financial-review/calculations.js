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

function addMonths(value, months) {
  const [year, month, day] = String(value).split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return formatDate(target);
}

export function nextScheduledDate(value, cadence) {
  if (cadence === "weekly") return addDays(value, 7);
  if (cadence === "biweekly" || cadence === "fortnightly") return addDays(value, 14);
  if (cadence === "quarterly") return addMonths(value, 3);
  if (cadence === "annual" || cadence === "yearly") return addMonths(value, 12);
  return addMonths(value, 1);
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
  const monthlyEquivalent = options.monthlyEquivalent || ((value, cadence) => cadence === "annual" ? number(value) / 12 : number(value));
  const recurringItems = [...(settings.recurring || []), ...(settings.subscriptions || [])].filter(item => item.active !== false);
  const recurringTotal = recurringItems.reduce((sum, item) => sum + monthlyEquivalent(item.amount, item.cadence), 0);
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
  const incomeMonthly = averageMonthlyIncome(transactions, today, options);
  const expenses = expenseForecast(transactions, settings, today, options);
  const dailyIncome = incomeMonthly / DAYS_PER_MONTH;
  const dailyOther = expenses.otherAvg / DAYS_PER_MONTH;
  const end = addDays(today, days);
  const events = [];

  for (const item of [...(settings.recurring || []), ...(settings.subscriptions || [])].filter(entry => entry.active !== false && entry.nextDate)) {
    let date = item.nextDate;
    let guard = 0;
    while (date < today && guard++ < 100) date = nextScheduledDate(date, item.cadence);
    while (date <= end && guard++ < 200) {
      events.push({ date, name: item.name, amount: number(item.amount), kind: item.kind || "recurring" });
      date = nextScheduledDate(date, item.cadence);
    }
  }

  const scheduledByDate = new Map();
  for (const event of events) scheduledByDate.set(event.date, (scheduledByDate.get(event.date) || 0) + event.amount);
  let balance = number(opening);
  let minBalance = balance;
  let totalIncome = 0;
  let totalOther = 0;
  let totalScheduled = 0;
  const points = [];

  for (let index = 0; index <= days; index++) {
    const date = addDays(today, index);
    const scheduled = scheduledByDate.get(date) || 0;
    balance += dailyIncome - dailyOther - scheduled;
    totalIncome += dailyIncome;
    totalOther += dailyOther;
    totalScheduled += scheduled;
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
    recurringMonthly: expenses.recurringTotal
  };
}
