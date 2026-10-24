export function monthDays(month) {
  const [year, index] = String(month).split("-").map(Number);
  if (!year || index < 1 || index > 12) return [];
  const count = new Date(year, index, 0).getDate();
  return Array.from({ length: count }, (_, day) => `${year}-${String(index).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`);
}

export function shiftMonth(month, delta) {
  const [year, index] = String(month).split("-").map(Number);
  const date = new Date(year, index - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildTimeline({ month, today, transactions = [], settings = {}, dateInstances = [], liabilityPayment = () => 0 }) {
  const days = monthDays(month);
  if (!days.length) return { events: [], outgoing: 0, expectedIncome: 0, recordedOutgoing: 0, recordedIncome: 0, transactionCount: 0, spendingCategories: [] };
  const last = days.at(-1);
  const events = [];
  const add = event => { if (event.date >= days[0] && event.date <= last) events.push(event); };
  const savedTransactions = new Set((transactions || []).map(item => item?.id).filter(Boolean));
  const recorded = (transactions || []).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item?.date || "") && item.date >= days[0] && item.date <= last);
  const hasTag = (item, tag) => (Array.isArray(item?.tags) ? item.tags : []).some(value => String(value).toLowerCase() === tag);
  const isTransfer = item => item.category === "Transfer - Own Accounts" || hasTag(item, "transfer");
  const isRefund = item => hasTag(item, "refund");
  let recordedOutgoing = 0;
  let recordedIncome = 0;
  const categories = new Map();
  for (const [index, item] of recorded.entries()) {
    const amount = Math.abs(Number(item.amount) || 0);
    if (!isTransfer(item)) {
      if (isRefund(item)) recordedOutgoing -= amount;
      else if (item.type === "income") recordedIncome += amount;
      else recordedOutgoing += amount;
      if (isRefund(item) || item.type !== "income") {
        const category = item.category || "Uncategorized";
        categories.set(category, (categories.get(category) || 0) + (isRefund(item) ? -amount : amount));
      }
    }
    add({ id: `transaction:${item.id || index}`, name: item.merchant || item.description || item.name || "Transaction", date: item.date, amount, netAmount: isTransfer(item) ? 0 : isRefund(item) ? amount : item.type === "income" ? amount : -amount, direction: isTransfer(item) ? "none" : item.type === "income" ? "income" : "outgoing", status: isTransfer(item) ? "transfer" : isRefund(item) ? "refund" : "recorded", detail: `${item.category || "Uncategorized"}${item.account ? ` · ${item.account}` : ""}`, tab: "transactions" });
  }
  for (const instance of dateInstances) {
    if (!instance?.dueDate) continue;
    add({ id: `date:${instance.key}`, name: instance.name || "Date to remember", date: instance.dueDate, amount: Number(instance.amount) || null, direction: instance.category === "income" ? "income" : instance.category === "important" ? "none" : "outgoing", status: instance.txId && savedTransactions.has(instance.txId) ? "recorded" : instance.paid ? "scheduled" : instance.dueDate < today ? "overdue" : "scheduled", detail: instance.paid && !instance.txId ? "Marked paid; no transaction is linked." : "Saved in Dates to Remember.", tab: "dates" });
  }
  for (const [items, label] of [[settings.recurring, "Recurring"], [settings.subscriptions, "Subscription"]]) {
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || item.active === false || !item.nextDate) continue;
      add({ id: `${label}:${item.id}:${item.nextDate}`, name: item.name || item.merchant || label, date: item.nextDate, amount: Number(item.amount) || null, direction: item.type === "income" ? "income" : "outgoing", status: item.nextDate < today ? "overdue" : "scheduled", detail: `${label} projection; no transaction is created.`, tab: "recurring" });
    }
  }
  for (const account of Array.isArray(settings.netWorthAccounts) ? settings.netWorthAccounts : []) {
    if (!account || account.type !== "liability" || !(Number(account.balance) > 0) || !(Number(account.paymentDueDay) > 0)) continue;
    const day = Math.min(Number(account.paymentDueDay), days.length);
    const date = days[day - 1];
    add({ id: `loan:${account.id}:${month}`, name: account.name || "Loan payment", date, amount: liabilityPayment(account), direction: "outgoing", status: date < today ? "overdue" : "scheduled", detail: "Required loan payment from the saved liability.", tab: "liabilities" });
  }
  if (Number(settings.monthlyPlanIncome) > 0) add({ id: `income:${month}`, name: "Expected monthly income", date: days[0], amount: Number(settings.monthlyPlanIncome), direction: "income", status: "estimated", detail: "Monthly budget assumption; not a recorded payment.", tab: "budgets" });
  for (const goal of Array.isArray(settings.goals) ? settings.goals : []) {
    if (!goal || !(Number(goal.plannedMonthly) > 0)) continue;
    add({ id: `goal:${goal.id}:${month}`, name: `${goal.name || "Goal"} contribution`, date: days[0], amount: Number(goal.plannedMonthly), direction: "outgoing", status: "estimated", detail: "Monthly goal plan; no contribution is posted automatically.", tab: "goals" });
  }
  const seen = new Set();
  const hasDatedIncome = events.some(event => event.direction === "income" && !event.id.startsWith("transaction:") && event.status !== "recorded" && !event.id.startsWith("income:"));
  for (const event of events) {
    const signature = `${event.date}|${event.direction}|${Number(event.amount).toFixed(2)}|${event.name.toLowerCase().trim()}`;
    event.counted = !event.id.startsWith("transaction:") && event.status !== "recorded" && event.amount != null && !seen.has(signature) && !(hasDatedIncome && event.id.startsWith("income:"));
    if (event.counted) seen.add(signature);
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  return {
    events,
    outgoing: events.filter(event => event.counted && event.direction === "outgoing").reduce((sum, event) => sum + event.amount, 0),
    expectedIncome: events.filter(event => event.counted && event.direction === "income").reduce((sum, event) => sum + event.amount, 0),
    recordedOutgoing,
    recordedIncome,
    transactionCount: recorded.length,
    spendingCategories: [...categories].filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([category, amount]) => ({ category, amount }))
  };
}
