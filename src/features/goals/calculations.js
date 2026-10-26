function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? date : null;
}

export function contributionPlan(goal, current, today) {
  if (!goal?.dueDate || !goal?.target) return null;
  const start = parseDateOnly(today);
  const due = parseDateOnly(goal.dueDate);
  if (!start || !due) return null;
  const wholeMonths = (due.getUTCFullYear() - start.getUTCFullYear()) * 12 + due.getUTCMonth() - start.getUTCMonth();
  const months = Math.max(0, wholeMonths + (due.getUTCDate() > start.getUTCDate() ? 1 : 0));
  const target = Number(goal.target) || 0;
  const inflationRate = Math.max(0, Number(goal.inflationRate) || 0);
  const adjustedTarget = inflationRate > 0 ? target * Math.pow(1 + inflationRate / 100, months / 12) : target;
  const remaining = Math.max(0, adjustedTarget - (Number(current) || 0));
  const requiredMonthly = months > 0 ? remaining / months : remaining;
  const plannedMonthly = Number(goal.plannedMonthly) || 0;
  const projected = (Number(current) || 0) + plannedMonthly * months;
  const coverage = requiredMonthly > 0 ? plannedMonthly / requiredMonthly : 1;
  const status = remaining <= 0 ? "Funded" : months <= 0 ? "Past due" : coverage >= 1 ? "Plan reaches target" : coverage >= 0.8 ? "Close, but needs a little more" : "Plan needs attention";
  return { months, target, adjustedTarget, inflationRate, remaining, requiredMonthly, plannedMonthly, projected, coverage, status };
}
