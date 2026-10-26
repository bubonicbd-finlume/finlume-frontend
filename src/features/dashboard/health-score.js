// Planning indicator, not a credit score. Each available factor receives its
// documented weight; if core income or spending data is absent, no score is
// produced. Goals and debt are optional and omitted from normalization when
// the user has not recorded them.
const clamp = value => Math.max(0, Math.min(1, value));

export function financialHealthScore({ monthlyIncome, monthlySpending, liquidAssets, monthlyDebt, goals = [] }) {
  const income = Number(monthlyIncome);
  const spending = Number(monthlySpending);
  if (!Number.isFinite(income) || income <= 0 || !Number.isFinite(spending) || spending < 0) {
    return { score: null, factors: [], message: "Add a completed month of income and spending to calculate a score." };
  }
  const savingsRate = (income - spending) / income;
  const factors = [
    { key: "savings", label: "Savings rate", weight: 25, value: Math.round(clamp(savingsRate / 0.2) * 100), detail: `${Math.round(savingsRate * 100)}% of income kept; 20% earns full points.` },
    { key: "cashflow", label: "Monthly cash flow", weight: 15, value: Math.round(clamp((income - spending) / (income * 0.1)) * 100), detail: "A surplus of 10% of income earns full points." }
  ];
  const debt = Number(monthlyDebt);
  if (Number.isFinite(debt) && debt >= 0) factors.push({ key: "debt", label: "Debt service", weight: 20, value: Math.round((1 - clamp(debt / (income * 0.4))) * 100), detail: `${Math.round(debt / income * 100)}% of income goes to monthly debt payments; 40% or more earns no points.` });
  const assets = liquidAssets == null ? NaN : Number(liquidAssets);
  if (Number.isFinite(assets) && assets >= 0 && spending > 0) factors.push({ key: "emergency", label: "Emergency coverage", weight: 20, value: Math.round(clamp(assets / (spending * 6)) * 100), detail: `${(assets / spending).toFixed(1)} months of spending covered; six months earns full points.` });
  const activeGoals = goals.filter(goal => Number(goal?.target) > 0);
  if (activeGoals.length) {
    const target = activeGoals.reduce((sum, goal) => sum + Number(goal.target), 0);
    const saved = activeGoals.reduce((sum, goal) => sum + Math.max(0, Number(goal.current) || 0), 0);
    factors.push({ key: "goals", label: "Goal progress", weight: 20, value: Math.round(clamp(saved / target) * 100), detail: `${Math.round(clamp(saved / target) * 100)}% of recorded goal targets funded.` });
  }
  const availableWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const score = Math.round(factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0) / availableWeight);
  const strongest = [...factors].sort((a, b) => b.value - a.value)[0];
  const weakest = [...factors].sort((a, b) => a.value - b.value)[0];
  const suggestions = {
    savings: "Review flexible spending or increase the amount set aside each month.",
    cashflow: "Aim for a consistent monthly surplus before adding new commitments.",
    debt: "Consider reducing debt payments relative to income or avoiding new borrowing.",
    emergency: "Build cash reserves toward six months of typical spending.",
    goals: "Increase contributions to the goals that matter most to you."
  };
  const positives = factors.filter(factor => factor.value >= 70).sort((a, b) => b.value - a.value).map(factor => `${factor.label} is supporting your score.`);
  const attention = factors.filter(factor => factor.value < 70).sort((a, b) => a.value - b.value).map(factor => `${factor.label}: ${suggestions[factor.key]}`);
  return { score, factors, strongest, weakest, coverageWeight: availableWeight, suggestion: suggestions[weakest.key], positives, attention, message: "Informational planning score based on available saved data; not a credit score." };
}

export function financialHealthTrend({ transactions = [], liquidAssets, monthlyDebt, goals = [], months = 6 }) {
  const grouped = new Map();
  for (const item of transactions) {
    if (!item?.date || !["income", "expense"].includes(item.type)) continue;
    const month = String(item.date).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const row = grouped.get(month) || { income: 0, spending: 0 };
    const amount = Math.max(0, Number(item.amount) || 0);
    if (item.type === "income") row.income += amount;
    else if (!Array.isArray(item.tags) || !item.tags.includes("Transfer")) row.spending += amount;
    grouped.set(month, row);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-Math.max(2, Number(months) || 6)).map(([month, row]) => ({
    month,
    ...financialHealthScore({ monthlyIncome: row.income, monthlySpending: row.spending, liquidAssets, monthlyDebt, goals })
  })).filter(item => item.score !== null);
}
