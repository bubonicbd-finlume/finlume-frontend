function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shiftMonth(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function categorySpendForMonth(transactions, month, options = {}) {
  const isSelfTransfer = options.isSelfTransfer || (() => false);
  const isRefund = options.isRefund || (() => false);
  const byCategory = new Map();

  for (const transaction of transactions || []) {
    if (!transaction?.date?.startsWith(month) || isSelfTransfer(transaction)) continue;
    const category = transaction.category || "Needs review";
    if (isRefund(transaction)) {
      byCategory.set(category, (byCategory.get(category) || 0) - amount(transaction.amount));
    } else if (transaction.type === "expense") {
      byCategory.set(category, (byCategory.get(category) || 0) + amount(transaction.amount));
    }
  }

  return byCategory;
}

export function buildBudgetRows(budgets, currentSpend, previousSpend, monthElapsedPct) {
  return (budgets || []).map(budget => {
    const limit = amount(budget.limit);
    const lastSpent = amount(previousSpend?.get(budget.category));
    const rolloverMode = budget.rolloverMode || (budget.rollover ? "unused" : "none");
    const rolloverAmount = rolloverMode === "full"
      ? limit - lastSpent
      : rolloverMode === "unused"
        ? Math.max(0, limit - lastSpent)
        : 0;
    const effectiveLimit = Math.max(0, limit + rolloverAmount);
    const spent = amount(currentSpend?.get(budget.category));
    const pct = effectiveLimit > 0 ? spent / effectiveLimit * 100 : 0;

    return {
      ...budget,
      limit,
      rolloverMode,
      spent,
      effectiveLimit,
      rolloverAmount,
      remaining: effectiveLimit - spent,
      pct,
      paceDiff: pct - amount(monthElapsedPct)
    };
  });
}

export function averageCompletedMonthIncome(transactions, today, count = 3, options = {}) {
  const isSelfTransfer = options.isSelfTransfer || (() => false);
  const isRefund = options.isRefund || (() => false);
  const currentMonth = String(today).slice(0, 7);
  const completedMonths = [];

  for (let index = 1; index <= count; index++) {
    const month = shiftMonth(currentMonth, -index);
    const income = (transactions || []).reduce((sum, transaction) => {
      if (!transaction?.date?.startsWith(month) || transaction.type !== "income") return sum;
      if (isSelfTransfer(transaction) || isRefund(transaction)) return sum;
      return sum + amount(transaction.amount);
    }, 0);
    if (income > 0) completedMonths.push(income);
  }

  return completedMonths.length
    ? completedMonths.reduce((sum, value) => sum + value, 0) / completedMonths.length
    : 0;
}

export function envelopeSummary({ budgets, recurring, subscriptions, plannedIncome, suggestedIncome, monthlyEquivalent }) {
  const budgetTotal = (budgets || []).reduce((sum, budget) => sum + amount(budget.limit), 0);
  const commitments = [...(recurring || []), ...(subscriptions || [])].filter(item => item.active !== false);
  const recurringTotal = commitments.reduce((sum, item) => sum + amount(monthlyEquivalent(item.amount, item.cadence)), 0);
  const income = amount(plannedIncome) || amount(suggestedIncome);

  return {
    plannedIncome: income,
    budgetTotal,
    recurringTotal,
    unallocated: income - budgetTotal - recurringTotal
  };
}
