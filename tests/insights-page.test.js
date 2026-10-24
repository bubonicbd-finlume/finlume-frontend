import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createInsightsPage } from "../src/features/insights/page.js";
import { createInsightsPanels } from "../src/features/insights/panels.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, BarChart3: icon, Button: box, Card: box,
  EmptyState: ({ title }) => React.createElement("p", null, title),
  Modal: ({ title, children }) => React.createElement("div", null, title, children),
  Sparkles: icon,
  formatCurrency: n => `₹${n}`, formatDateDisplay: s => s,
  insAnchorFor: () => "2026-10-17", insComputePatterns: () => [],
  insComputeYear: () => ({ count: 0, income: 0 }),
  insDataMonths: () => [], insDetectAnomalies: () => [],
  insDrillStats: () => ({ thisMonth: 0, toDateAvg: 0, avg: 0,
    windowTotal: 0, count: 0, series: [], merchants: [], biggest: [],
    recent: [], unusual: new Set() }),
  insExpenses: () => [], insMonthKeys: () => ["2026-10"],
  insMonthLabel: () => "October 2026", insPickDefault: () => "2026-10",
  insToday: () => "2026-10-17", insYearOptions: () => [{ id: "last12", label: "Last 12 months" }],
  monthKey: s => s.slice(0, 7), normalizeMerchant: s => s,
  selectCls: "", setInsAsOf() {}, todayYMD: () => "2026-10-17",
};

test("extracted Insights page renders empty spending and year review", () => {
  const Page = createInsightsPage(deps);
  const html = renderToString(React.createElement(Page, {
    transactions: [], settings: {}, onGoTo() {}, onSaveSettings() {},
  }));
  assert.match(html, /Spending patterns/);
  assert.match(html, /Not enough history yet/);
  assert.match(html, /Year in review/);
  assert.match(html, /No transactions in this period/);
});

test("extracted Insights drill-down retains its transaction shortcut", () => {
  const { InsightsDrillModal } = createInsightsPanels(deps);
  const html = renderToString(React.createElement(InsightsDrillModal, {
    drill: { category: "Groceries" }, transactions: [],
    onClose() {}, onPick() {}, onViewAll() {},
  }));
  assert.match(html, /Groceries/);
  assert.match(html, /View these in Transactions/);
  assert.match(html, /Largest transactions/);
});

test("extracted Insights panels show patterns, anomalies and category explorer", () => {
  const tx = { id: "1", date: "2026-10-10", type: "expense", amount: 500,
    category: "Groceries", merchant: "Market" };
  const populated = {
    ...deps,
    insComputePatterns: () => [{ id: "pattern", title: "Groceries rose", detail: "Above usual",
      tone: "up", category: "Groceries" }],
    insDetectAnomalies: () => [{ id: "unusual", title: "Unusual charge",
      detail: "Larger than usual", tx }],
    insExpenses: () => [tx],
    insComputeYear: () => ({ count: 1, income: 1000, spent: 500, saved: 500,
      rate: 50, biggest: tx, lowest: null, highest: null, nw: null,
      topCats: [["Groceries", 500]] }),
  };
  const Page = createInsightsPage(populated);
  const html = renderToString(React.createElement(Page, {
    transactions: [tx], settings: {}, onGoTo() {}, onSaveSettings() {},
  }));
  assert.match(html, /Groceries rose/);
  assert.match(html, /Unusual charge/);
  assert.match(html, /Explore by category/);
  assert.match(html, /Total saved/);
});
