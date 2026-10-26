import test from "node:test";
import assert from "node:assert/strict";
import { FINANCE_NAV_GROUPS, financeBreadcrumb, financeNavGroup, pushFinanceTab, readFinanceTab } from "../src/platform/finance-navigation.js";

test("Finance navigation preserves existing query values and supports back state", () => {
  const tabs = [{ id: "dashboard" }, { id: "timeline" }, { id: "settings" }];
  const windowObject = { location: { href: "https://finlume.example/?source=test", search: "?source=test" }, history: { state: null, pushState(state, title, url) { this.state = state; windowObject.location.href = String(url); windowObject.location.search = url.search; } } };
  assert.equal(readFinanceTab(windowObject.location, tabs), "dashboard");
  assert.equal(pushFinanceTab(windowObject, "timeline", tabs), true);
  assert.equal(readFinanceTab(windowObject.location, tabs), "timeline");
  assert.equal(new URL(windowObject.location.href).searchParams.get("source"), "test");
  assert.equal(pushFinanceTab(windowObject, "missing", tabs), false);
  windowObject.location.search = "?source=test&fin=settings";
  assert.equal(readFinanceTab(windowObject.location, tabs), "settings");
  assert.equal(financeNavGroup("timeline"), "Planning");
  assert.equal(financeNavGroup("data-health"), "Settings");
});

test("Finance navigation exposes formal groups and breadcrumbs", () => {
  assert.deepEqual(FINANCE_NAV_GROUPS, ["Dashboard", "Transactions", "Planning", "Liabilities", "Wealth", "Reports", "Settings"]);
  assert.equal(financeNavGroup("liabilities"), "Liabilities");
  assert.deepEqual(financeBreadcrumb("reports", [{ id: "reports", label: "Reports" }]), ["Reports", "Reports"]);
});
