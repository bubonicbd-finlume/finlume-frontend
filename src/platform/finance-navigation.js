const GROUPS = {
  dashboard: "Overview", review: "Overview", reports: "Overview", insights: "Overview",
  transactions: "Activity", dates: "Activity", recurring: "Activity", budgets: "Activity",
  documents: "Activity", notes: "Activity", investments: "Activity", wealth: "Activity",
  liabilities: "Activity", goals: "Planning",
  timeline: "Planning", scenarios: "Planning",
  settings: "Settings", "data-health": "Settings", about: "Settings", admin: "Settings"
};

export const FINANCE_NAV_GROUPS = ["Overview", "Activity", "Planning", "Settings"];

export function financeNavGroup(id) { return GROUPS[id] || "Settings"; }

export function orderFinanceNavTabs(tabs) {
  const groupOrder = new Map(FINANCE_NAV_GROUPS.map((group, index) => [group, index]));
  return tabs.map((tab, index) => ({ tab, index }))
    .sort((a, b) => (groupOrder.get(financeNavGroup(a.tab.id)) ?? Infinity) - (groupOrder.get(financeNavGroup(b.tab.id)) ?? Infinity) || a.index - b.index)
    .map(({ tab }) => tab);
}

export function financeBreadcrumb(id, tabs) {
  const tab = tabs.find(item => item.id === id);
  return tab ? [financeNavGroup(id), tab.label] : ["Dashboard", "Dashboard"];
}

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
