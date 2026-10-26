import test from "node:test";
import assert from "node:assert/strict";
import { buildActionableInsights, dismissInsight, snoozeInsight } from "../src/features/insights/actionable-insights.js";

test("actionable insights include metadata and lifecycle controls", () => {
  const input = { today: "2026-10-25", transactions: [{ date: "2026-08-01", type: "expense", amount: 100 }, { date: "2026-09-01", type: "expense", amount: 150 }], settings: {} };
  const item = buildActionableInsights(input)[0];
  for (const key of ["id", "severity", "title", "detail", "dateRange", "action", "tab", "generatedOn"]) assert.ok(item[key]);
  assert.ok(!buildActionableInsights({ ...input, settings: dismissInsight({}, item.id) }).some(candidate => candidate.id === item.id));
  assert.ok(!buildActionableInsights({ ...input, settings: snoozeInsight({}, item.id, input.today) }).some(candidate => candidate.id === item.id));
});

test("insights derive savings, emergency, budget and maturity warnings from processed data", () => {
  const insights = buildActionableInsights({ today: "2026-10-25", transactions: [
    { date: "2026-09-01", type: "income", amount: 1000 }, { date: "2026-09-02", type: "expense", amount: 500, category: "Food" },
    { date: "2026-10-01", type: "income", amount: 1000 }, { date: "2026-10-02", type: "expense", amount: 800, category: "Food" }
  ], settings: { budgets: [{ id: "food", category: "Food", limit: 500 }], netWorthAccounts: [{ type: "asset", category: "Cash & Bank", balance: 100 }, { type: "liability", balance: 1000, minPayment: 100, endDate: "2026-12-01" }] } });
  const titles = insights.map(item => item.title);
  assert.ok(titles.includes("Savings rate fell"));
  assert.ok(titles.includes("Emergency fund is below target"));
  assert.ok(titles.includes("Food is over budget"));
  assert.ok(titles.includes("A liability is approaching maturity"));
  assert.ok(insights.every(item => item.supportingFigures));
});
