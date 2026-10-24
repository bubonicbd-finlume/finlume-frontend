import { addDays, currentMonthSummary, findBudgetWarnings } from "./calculations.js";

// This is a read-only projection. It never creates reminders or transactions.
export function buildActionInbox({ transactions, settings, today, dateInstances = [], isSelfTransfer = () => false, isRefund = () => false }) {
  const items = [];
  const horizon = addDays(today, 30);
  const month = currentMonthSummary(transactions, today, { isSelfTransfer, isRefund });
  const uncategorized = (transactions || []).filter(t => t && t.category === "Needs review");
  if (uncategorized.length) items.push({ key: "categorization", title: `${uncategorized.length} ${uncategorized.length === 1 ? "transaction needs" : "transactions need"} categorising`, reason: "Saved transactions have the Needs review category.", kind: "recorded", tab: "transactions" });
  for (const instance of dateInstances) {
    if (!instance || instance.paid || !instance.dueDate || instance.dueDate > horizon) continue;
    items.push({ key: `date:${instance.key}`, title: instance.name || "Date to remember", reason: instance.dueDate < today ? "This saved date is overdue." : "This saved date is due within 30 days.", date: instance.dueDate, amount: instance.amount, kind: instance.dueDate < today ? "overdue" : "scheduled", tab: "dates" });
  }
  for (const [collection, label] of [[settings.recurring, "Recurring payment"], [settings.subscriptions, "Subscription"]]) {
    for (const item of Array.isArray(collection) ? collection : []) {
      if (!item || item.active === false || item.type === "income" || !item.nextDate || item.nextDate < today || item.nextDate > horizon) continue;
      items.push({ key: `${label}:${item.id}:${item.nextDate}`, title: item.name || item.merchant || label, reason: `${label} is projected from its saved schedule; no transaction has been recorded here.`, date: item.nextDate, amount: Number(item.amount) || null, kind: "scheduled", tab: "recurring" });
    }
  }
  for (const budget of findBudgetWarnings(settings.budgets || [], month.spentByCategory)) {
    const spent = month.spentByCategory.get(budget.category) || 0;
    items.push({ key: `budget:${budget.category}`, title: `${budget.category} budget warning`, reason: `Recorded spending this month is ${Math.round(spent / Number(budget.limit) * 100)}% of the saved monthly limit.`, amount: spent, kind: "recorded", tab: "budgets" });
  }
  return items.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}
