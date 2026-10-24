import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createDashboardPage } from "../src/features/dashboard/page.js";
import * as dashboardCalculations from "../src/features/dashboard/calculations.js";
import { financialSummary, monthlyInsight } from "../src/features/transactions/calculations.js";
import { combinedNetWorth, investmentSummary } from "../src/features/wealth/calculations.js";
import { monthlyEquivalent } from "../src/features/recurring/calculations.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  ArrowDownRight: icon, ArrowUpRight: icon, Button: box, CalendarClock: icon,
  Card: box, ChevronDown: icon, CreditCard: icon, DONUT_COLORS: ["#4f46e5"],
  EmptyState: ({ title }) => React.createElement("p", null, title),
  INVESTMENT_CLASS_COLORS: {}, LayoutDashboard: icon,
  Modal: ({ open, title, children }) => open
    ? React.createElement("div", null, title, children) : null,
  PeriodSelector: () => null, PiggyBank: icon, ProgressBar: () => null,
  Receipt: icon, Repeat: icon, ShieldAlert: icon, SlidersHorizontal: icon,
  Sparkles: icon, SummaryCard: ({ label }) => React.createElement("div", null, label),
  Target: icon, TrendingUp: icon, Wallet: icon,
  computeCombinedNetWorth: combinedNetWorth,
  computeFinancials: (transactions, period) => financialSummary(transactions, period, "2026-10-18"),
  computeInvestmentSummary: investmentSummary,
  computeMonthlyInsight: transactions => monthlyInsight(transactions, "2026-10-18"),
  detectRecurringCandidates: () => [],
  formatCurrency: n => `₹${n}`, formatDateDisplay: s => s || "",
  hasSystemTag: () => false, isCategoryEssential: () => false,
  isSelfTransfer: () => false, isStaleAccount: () => false,
  liabilityEffectivePayment: () => 0, monthKey: s => s.slice(0, 7),
  monthlyEquivalent, nowISO: () => "2026-10-18T00:00:00Z",
  todayYMD: () => "2026-10-18", upsertNetWorthSnapshot: h => h,
  useFlashColor: () => "",
};
const settings = {
  accounts: [], assetsTotal: 0, liabilitiesTotal: 0,
  netWorthAccounts: [], netWorthHistory: [], investments: [], goals: [],
  recurring: [], subscriptions: [], budgets: [], categoryEssential: {},
  selectedPeriod: "this-month", dismissedPatterns: [],
};

function render(transactions, override = {}) {
  globalThis.window = { __FINLUME_FEATURES__: { dashboard: dashboardCalculations } };
  const Page = createDashboardPage(deps);
  return renderToString(React.createElement(Page, {
    transactions, settings: { ...settings, ...override }, onGoTo() {},
    onSaveSettings() {}, onOpenNetWorth() {},
  }));
}

test("extracted Dashboard renders a useful empty account view", () => {
  const html = render([]);
  assert.match(html, /Dashboard|Overview/);
  assert.match(html, /No transactions|Add|Import/);
});

test("extracted Dashboard shows the command centre with transactions", () => {
  const html = render([
    { id: "income", date: "2026-10-02", type: "income", amount: 10000,
      merchant: "Salary", category: "Salary" },
    { id: "spend", date: "2026-10-04", type: "expense", amount: 1000,
      merchant: "Market", category: "Groceries" },
  ]);
  assert.match(html, /₹10000/);
  assert.match(html, /Groceries/);
});
