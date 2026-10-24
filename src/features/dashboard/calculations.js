function parseDateOnly(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toDateOnly(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(today, numberOfDays) {
  const date = parseDateOnly(today);
  date.setDate(date.getDate() + numberOfDays);
  return toDateOnly(date);
}

export function daysUntil(date, today) {
  return Math.ceil((parseDateOnly(date) - parseDateOnly(today)) / 86400000);
}

export function nextMonthlyDueDate(paymentDueDay, today) {
  const start = parseDateOnly(today);
  const requestedDay = Math.min(31, Math.max(1, Number(paymentDueDay) || 1));
  function candidateFor(year, month) {
    const finalDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(requestedDay, finalDay));
  }
  let candidate = candidateFor(start.getFullYear(), start.getMonth());
  if (candidate < start) candidate = candidateFor(start.getFullYear(), start.getMonth() + 1);
  return toDateOnly(candidate);
}

export function currentMonthSummary(transactions, today, predicates = {}) {
  const isSelfTransfer = predicates.isSelfTransfer || (() => false);
  const isRefund = predicates.isRefund || (() => false);
  const currentMonth = String(today).slice(0, 7);
  const monthTransactions = (transactions || []).filter(transaction => String(transaction.date || "").slice(0, 7) === currentMonth && !isSelfTransfer(transaction));
  let income = 0;
  let spending = 0;
  const spentByCategory = new Map();
  for (const transaction of monthTransactions) {
    const amount = Number(transaction.amount) || 0;
    if (isRefund(transaction)) {
      spending -= amount;
      spentByCategory.set(transaction.category, (spentByCategory.get(transaction.category) || 0) - amount);
      continue;
    }
    if (transaction.type === "income") income += amount;
    if (transaction.type === "expense") {
      spending += amount;
      spentByCategory.set(transaction.category, (spentByCategory.get(transaction.category) || 0) + amount);
    }
  }
  return { monthTransactions, income, spending, recordedMargin: income - spending, spentByCategory };
}

export function findBudgetWarnings(budgets, spentByCategory, threshold = 0.8) {
  return (budgets || []).filter(budget => {
    const limit = Number(budget.limit) || 0;
    if (limit <= 0) return false;
    return Math.max(0, spentByCategory.get(budget.category) || 0) / limit >= threshold;
  });
}
