import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import * as budgetCalculations from "../src/features/budgets/calculations.js";
import { createBudgetsPage } from "../src/features/budgets/page.js";
import { createBudgetHistory } from "../src/features/budgets/history.js";
import { createBudgetPlanningCard } from "../src/features/budgets/planning.js";

globalThis.window = { __FINLUME_FEATURES__: { budgets: budgetCalculations } };

const passthrough = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const budget = { id: "food", category: "Food", limit: 1000, active: true, rolloverMode: "unused" };
const deps = {
  Button: passthrough, Card: passthrough, EmptyState: ({ title }) => React.createElement("p", null, title),
  HowItWorksButton: () => null, IconButton: icon, ManageEntryModal: () => null,
  Pencil: icon, PiggyBank: icon, Plus: icon, ProgressBar: () => null, Wallet: icon,
  addMonthsToYMD: () => "2026-09-17", formatCurrency: n => `₹${n}`,
  hasSystemTag: () => false, isSelfTransfer: () => false, inputCls: "",
  monthKey: date => date.slice(0, 7), todayYMD: () => "2026-10-17", dtLocalToday: () => "2026-10-17",
  uid: () => "new", monthlyEquivalent: () => 0,
  budgetSpendIndex: () => new Map([["2026-09", new Map([["Food", 600]])]]),
  budgetShiftMonth: (month, offset) => {
    const [year, value] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, value - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  },
  budgetMonthLabel: month => month,
  budgetPerformance: () => ({ rows: [{ ...budget, spent: 600, limit: 1000, pct: 60, over: false, diff: 400 }],
    totalSpent: 600, totalLimit: 1000, kept: 1, overCount: 0 }),
  budgetTone2: () => "emerald",
};

test("extracted Budgets page renders an empty current month", () => {
  const Page = createBudgetsPage(deps);
  const html = renderToString(React.createElement(Page, {
    transactions: [], settings: { budgets: [], categories: [], recurring: [], subscriptions: [] }, onSaveSettings() {}, userId: "test",
  }));
  assert.match(html, /No budgets yet/);
  assert.match(html, /Monthly money plan/);
  assert.match(html, /Create budget/);
});

test("extracted Budgets page renders a saved envelope", () => {
  const Page = createBudgetsPage(deps);
  const html = renderToString(React.createElement(Page, {
    transactions: [{ date: "2026-10-02", type: "expense", category: "Food", amount: 300 }],
    settings: { budgets: [budget], categories: ["Food"], recurring: [], subscriptions: [] }, onSaveSettings() {}, userId: "test",
  }));
  assert.match(html, /Food/);
  assert.match(html, /₹300/);
  assert.match(html, /₹1000/);
});

test("extracted history and planning panels render saved budget data", () => {
  const History = createBudgetHistory(deps);
  const Planning = createBudgetPlanningCard(deps);
  const history = renderToString(React.createElement(History, { budgets: [budget], transactions: [] }));
  const planning = renderToString(React.createElement(Planning, {
    transactions: [], settings: { budgets: [budget], recurring: [], subscriptions: [], monthlyPlanIncome: 3000 }, onSaveSettings() {},
  }));
  assert.match(history, /Food/);
  assert.match(planning, /Budget envelopes/);
  assert.match(planning, /Still unallocated/);
});
