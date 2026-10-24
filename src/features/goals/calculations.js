function parseDateOnly(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function contributionPlan(goal, current, today) {
  if (!goal?.dueDate || !goal?.target) return null;
  const start = parseDateOnly(today);
  const due = parseDateOnly(goal.dueDate);
  const months = Math.max(0, Math.ceil((due - start) / 2629800000));
  const remaining = Math.max(0, Number(goal.target) - (Number(current) || 0));
  const requiredMonthly = months > 0 ? remaining / months : remaining;
  const plannedMonthly = Number(goal.plannedMonthly) || 0;
  const projected = (Number(current) || 0) + plannedMonthly * months;
  const coverage = requiredMonthly > 0 ? plannedMonthly / requiredMonthly : 1;
  const status = remaining <= 0 ? "Funded" : months <= 0 ? "Past due" : coverage >= 1 ? "Plan reaches target" : coverage >= 0.8 ? "Close, but needs a little more" : "Plan needs attention";
  return { months, remaining, requiredMonthly, plannedMonthly, projected, coverage, status };
}
