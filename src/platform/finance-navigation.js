const GROUPS = {
  dashboard: "Overview", review: "Overview", reports: "Overview", insights: "Overview",
  transactions: "Activity", dates: "Activity", recurring: "Activity", budgets: "Activity", documents: "Activity", notes: "Activity",
  timeline: "Planning", scenarios: "Planning", investments: "Planning", wealth: "Planning", liabilities: "Planning", goals: "Planning",
  settings: "Account", "data-health": "Account", about: "Account", admin: "Account"
};

export function financeNavGroup(id) { return GROUPS[id] || "Account"; }

export function readFinanceTab(location, tabs) {
  const id = new URLSearchParams(location.search).get("fin");
  return tabs.some(tab => tab.id === id) ? id : "dashboard";
}

export function pushFinanceTab(windowObject, tab, tabs) {
  if (!tabs.some(item => item.id === tab)) return false;
  const url = new URL(windowObject.location.href);
  if (url.searchParams.get("fin") === tab) return true;
  url.searchParams.set("fin", tab);
  windowObject.history.pushState({ ...windowObject.history.state, fin: tab }, "", url);
  return true;
}
