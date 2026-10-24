function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthParts(today, offset = 0) {
  const [year, month] = String(today).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthKeyFromParts(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function lastDay(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthBounds(parts) {
  const key = monthKeyFromParts(parts);
  return { start: `${key}-01`, end: `${key}-${String(lastDay(parts.year, parts.month)).padStart(2, "0")}` };
}

export function periodBounds(period, today) {
  const current = monthParts(today);
  if (typeof period === "string" && period.startsWith("custom:")) {
    const [, from, to] = period.split(":");
    if (!/^\d{4}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}$/.test(to || "")) return { start: null, end: null };
    const [fromYear, fromMonth] = from.split("-").map(Number);
    const [toYear, toMonth] = to.split("-").map(Number);
    return { start: `${from}-01`, end: `${to}-${String(lastDay(toYear, toMonth)).padStart(2, "0")}` };
  }
  if (period === "this-month") return monthBounds(current);
  if (period === "last-month") return monthBounds(monthParts(today, -1));
  if (period === "last-3-months") return { start: monthBounds(monthParts(today, -2)).start, end: monthBounds(current).end };
  if (period === "last-6-months") return { start: monthBounds(monthParts(today, -5)).start, end: monthBounds(current).end };
  if (period === "this-year") return { start: `${current.year}-01-01`, end: `${current.year}-12-31` };
  return { start: null, end: null };
}

export function inPeriod(transaction, period, today) {
  const { start, end } = periodBounds(period, today);
  if (!start) return true;
  const date = transaction?.date || "";
  return date >= start && date <= end;
}

export function financialSummary(transactions, period, today, options = {}) {
  const isSelfTransfer = options.isSelfTransfer || (() => false);
  const isRefund = options.isRefund || (() => false);
  const periodTx = (transactions || []).filter(transaction => inPeriod(transaction, period, today));
  let income = 0;
  let spending = 0;
  let transfersExcluded = 0;
  let refundsApplied = 0;
  const byCategory = new Map();

  for (const transaction of periodTx) {
    if (isSelfTransfer(transaction)) {
      transfersExcluded++;
      continue;
    }
    const category = transaction.category || "Needs review";
    if (isRefund(transaction)) {
      refundsApplied++;
      const value = number(transaction.amount);
      byCategory.set(category, (byCategory.get(category) || 0) - value);
      spending -= value;
    } else if (transaction.type === "income") {
      income += number(transaction.amount);
    } else {
      const value = number(transaction.amount);
      spending += value;
      byCategory.set(category, (byCategory.get(category) || 0) + value);
    }
  }
  return { income, spending, byCategory, transfersExcluded, refundsApplied, periodTx };
}

export function monthlyInsight(transactions, today, options = {}) {
  const previousMonth = monthParts(today, -1);
  const comparisonMonth = monthParts(today, -2);
  const previousKey = monthKeyFromParts(previousMonth);
  const comparisonKey = monthKeyFromParts(comparisonMonth);
  const cur = financialSummary(transactions, `custom:${previousKey}:${previousKey}`, today, options);
  const prev = financialSummary(transactions, `custom:${comparisonKey}:${comparisonKey}`, today, options);
  if (!cur.periodTx.length) return null;
  const categories = new Set([...cur.byCategory.keys(), ...prev.byCategory.keys()]);
  const movers = [...categories].map(category => {
    const current = cur.byCategory.get(category) || 0;
    const previous = prev.byCategory.get(category) || 0;
    return { category, delta: current - previous, current, previous };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const topMovers = prev.periodTx.length ? movers.filter(mover => Math.abs(mover.delta) >= 1).slice(0, 3) : [];
  const spendDelta = cur.spending - prev.spending;
  const savings = cur.income - cur.spending;
  const categoriesBySpend = [...cur.byCategory.entries()].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const top = categoriesBySpend[0] ? { category: categoriesBySpend[0][0], amount: categoriesBySpend[0][1], pct: cur.spending > 0 ? categoriesBySpend[0][1] / cur.spending * 100 : 0 } : null;
  const biggest = cur.periodTx.filter(transaction => transaction.type === "expense" && !options.isSelfTransfer?.(transaction) && !options.isRefund?.(transaction)).sort((a, b) => number(b.amount) - number(a.amount))[0] || null;
  const label = parts => new Date(Date.UTC(parts.year, parts.month - 1, 1)).toLocaleDateString(undefined, { month: "long", timeZone: "UTC" });
  return {
    cur,
    prev,
    monthName: label(previousMonth),
    prevName: label(comparisonMonth),
    hasPrev: prev.periodTx.length > 0,
    topMovers,
    spendDelta,
    spendPct: prev.spending > 0 ? spendDelta / prev.spending * 100 : null,
    savings,
    savingsRate: cur.income > 0 ? savings / cur.income * 100 : null,
    top,
    biggest
  };
}
