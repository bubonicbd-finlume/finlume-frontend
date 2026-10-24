function previousMonth(month) {
  const [year, index] = String(month).split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyInsights(transactions, month) {
  const previous = previousMonth(month);
  const totals = new Map([[month, { income: 0, spending: 0, count: 0 }], [previous, { income: 0, spending: 0, count: 0 }]]);
  const categories = new Map();
  const priorCategories = new Map();
  let needsReview = 0;
  for (const row of transactions || []) {
    const period = typeof row?.date === "string" ? row.date.slice(0, 7) : "";
    const total = totals.get(period);
    if (!total || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue;
    total.count++;
    if (period === month && row.category === "Needs review") needsReview++;
    const tags = Array.isArray(row.tags) ? row.tags : [];
    if (row.category === "Transfer - Own Accounts" || tags.some(tag => String(tag).toLowerCase() === "transfer")) continue;
    const amount = Math.abs(Number(row.amount) || 0);
    const refund = tags.some(tag => String(tag).toLowerCase() === "refund");
    if (refund || row.type !== "income") {
      const signed = refund ? -amount : amount;
      total.spending += signed;
      const category = row.category || "Uncategorized";
      const target = period === month ? categories : priorCategories;
      target.set(category, (target.get(category) || 0) + signed);
    } else total.income += amount;
  }
  const current = totals.get(month);
  const prior = totals.get(previous);
  const topChange = [...categories].filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1])[0] || null;
  const categoryIncrease = prior.count ? [...categories].map(([name, amount]) => ({ name, amount: amount - (priorCategories.get(name) || 0) })).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount)[0] || null : null;
  return { month, previous, current, prior, needsReview, topCategory: topChange && { name: topChange[0], amount: topChange[1] }, categoryIncrease, spendingChange: prior.count ? current.spending - prior.spending : null };
}
