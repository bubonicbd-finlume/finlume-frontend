import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createFinancialReviewPage } from "../src/features/financial-review/page.js";

const passthrough = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  Button: passthrough, Card: passthrough, Check: icon, EmptyState: ({ title }) => React.createElement("p", null, title),
  Field: passthrough, ListChecks: icon, ManageEntryModal: () => null, ProgressBar: () => null,
  Receipt: icon, RefreshCw: icon, SummaryCard: ({ label }) => React.createElement("div", null, label),
  TrendingUp: icon, WhatIfAssumptions: passthrough, commitNetWorthSnapshot() {},
  formatCurrency: n => `₹${n}`, formatDateDisplay: s => s || "",
  frForecast: () => ({ ending: 5000, minBalance: 2000, points: [], events: [],
    totalIncome: 3000, totalOther: 500, totalScheduled: 1000 }),
  frLiquidBalance: () => 1000, frMonthLabel: s => s, inputCls: "",
  monthKey: s => s.slice(0, 7), nowISO: () => "2026-10-17T00:00:00Z",
  todayYMD: () => "2026-10-17", uid: () => "new",
};
const settings = {
  accounts: ["Checking"], netWorthAccounts: [], recurring: [], subscriptions: [], budgets: [],
  monthlyReviews: {}, accountReconciliations: {}, cashFlowOpeningBalance: null,
};

function render(initialTab, transactions = []) {
  const Page = createFinancialReviewPage(deps);
  return renderToString(React.createElement(Page, {
    settings, transactions, onSaveSettings() {}, onGoTo() {}, initialTab,
  }));
}

test("extracted Financial Review shows monthly checklist and uncategorised count", () => {
  const html = render("review", [{ date: "2026-10-01", category: "Needs review", type: "expense", amount: 200 }]);
  assert.match(html, /Monthly Review/);
  assert.match(html, /Needs categorising/);
  assert.match(html, /Review transactions/);
  assert.match(html, /What changed this month/);
});

test("extracted reconciliation view shows account status", () => {
  const html = render("reconcile");
  assert.match(html, /Checking/);
  assert.match(html, /Reconciliation/);
});

test("extracted forecast view renders without scheduled items", () => {
  const html = render("forecast");
  assert.match(html, /Cash-flow Forecast/);
  assert.match(html, /No dated recurring payments/);
});
