import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createReportsPage } from "../src/features/reports/page.js";
import { createTaxEstimator } from "../src/features/tax/estimator.js";
import { estimatedTax } from "../src/features/tax/calculations.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, ArrowUpRight: icon, BarChart3: icon, Button: box,
  CalendarClock: icon, Card: box, ChevronDown: icon, DONUT_COLORS: ["#555"],
  DayTransactionsModal: () => null, Download: icon,
  EmptyState: ({ title }) => React.createElement("p", null, title),
  Field: box, FileText: icon, IconButton: icon, MONTH_NAMES_SHORT: [],
  MonthYearGrid: box, PERIOD_OPTIONS: [{ id: "this-month", label: "This month" },
    { id: "this-year", label: "This year" }], PiggyBank: icon, Plus: icon,
  ProgressBar: () => null, Receipt: icon, Sparkles: icon,
  SummaryCard: ({ label }) => React.createElement("div", null, label),
  TrendingDown: icon, TrendingUp: icon, Wallet: icon,
  WhatIfAssumptions: box, X: icon,
  addMonthsToYMD: () => "2026-10-01", computeAccountFreshness: () => [],
  computeEstimatedTax: estimatedTax,
  computeExpenseForecast: () => ({ hasData: false, upcomingBills: [], otherAvgByCategory: [] }),
  computeFYReports: () => [],
  computeFinancials: () => ({ income: 0, spending: 0 }),
  computeForecast: () => ({ points: [] }),
  computeHeatmapData: () => ({ firstWeekday: 0, days: [], max: 0 }),
  computeIncomeBySource: () => [], computeMonthlySeries: () => [],
  computeSpendingInsights: () => ({ hasData: false }),
  computeWaterfallData: () => [],
  computeYoyComparison: () => ({ hasData: false, monthLabel: "October" }),
  formatCurrency: n => `₹${n}`, formatDateDisplay: s => s || "",
  hasSystemTag: () => false, inputCls: "", insDataMonths: () => [],
  insMonthLabel: () => "October 2026", insPickDefault: () => "2026-10",
  isSelfTransfer: () => false, monthKey: () => "2026-10",
  parseYMD: s => new Date(`${s}T00:00:00`),
  projectScenario: () => ({ points: Array.from({ length: 12 }, () => ({ cumulative: 0 })) }),
  selectCls: "", todayYMD: () => "2026-10-17",
};
const settings = {
  accounts: [], goals: [], recurring: [], subscriptions: [], taxSlabs: [],
  taxStandardDeduction: 75000, taxSlabsVersion: "nr-2026-27",
};

test("extracted Reports page renders its empty analysis and tax panels", () => {
  const Page = createReportsPage(deps);
  const html = renderToString(React.createElement(Page, {
    transactions: [], settings, onSaveSettings() {}, onOpenNetWorth() {},
  }));
  assert.match(html, /Monthly review/);
  assert.match(html, /Cash flow waterfall/);
  assert.match(html, /Tax estimator/);
  assert.match(html, /Tax filing preparation/);
});

test("extracted tax estimator retains financial-year income and preparation summary", () => {
  const TaxEstimator = createTaxEstimator(deps);
  const html = renderToString(React.createElement(TaxEstimator, {
    transactions: [
      { date: "2026-10-01", type: "income", amount: 100000, category: "Salary" },
      { date: "2026-10-02", type: "expense", amount: 1000, category: "Medical" },
    ],
    settings, onSaveSettings() {},
  }));
  assert.match(html, /Salary/);
  assert.match(html, /₹100000/);
  assert.match(html, /Expenses to review/);
  assert.match(html, /Net tax payable/);
});
