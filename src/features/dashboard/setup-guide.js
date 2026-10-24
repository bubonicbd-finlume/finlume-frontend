export function buildSetupSteps(transactions = [], settings = {}) {
  return [
    { id: "transactions", title: "Add your first transaction", detail: "Record an entry or import a statement.", done: transactions.length > 0, action: "Open transactions", tab: "transactions" },
    { id: "budgets", title: "Set a monthly budget", detail: "Choose a category and a monthly limit.", done: (settings.budgets || []).length > 0, action: "Open budgets", tab: "budgets" },
    { id: "dates", title: "Add a date to remember", detail: "Keep a due date or reminder in Planning.", done: (settings.datesToRemember || []).length > 0, action: "Open dates", tab: "dates" }
  ];
}

export function setupGuideStorageKey(userId) {
  return `finlume:setup-guide:hidden:${userId}`;
}
