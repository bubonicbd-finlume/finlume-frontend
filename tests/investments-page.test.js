import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import * as wealth from "../src/features/wealth/calculations.js";
import { createInvestmentsPage } from "../src/features/investments/page.js";

globalThis.window = { __FINLUME_FEATURES__: { wealth } };

const passthrough = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  ASSET_CLASSES: ["Equity", "Debt", "Other"], ArrowDownRight: icon, ArrowUpRight: icon,
  Button: passthrough, CalendarClock: icon, Card: passthrough, EmptyState: ({ title }) => React.createElement("p", null, title),
  INVESTMENT_CLASS_COLORS: { Equity: "#4f46e5", Debt: "#0d9488", Other: "#94a3b8" },
  INVESTMENT_PURPOSES: ["General"], IconButton: icon, Link2: icon, Loader2: icon,
  ManageEntryModal: () => null, Modal: ({ open, children }) => open ? React.createElement("div", null, children) : null,
  NET_WORTH_ASSET_CATEGORIES: ["Cash & Equivalents"], Pencil: icon, PiggyBank: icon,
  Plus: icon, RefreshCw: icon, Repeat: icon, SAVINGS_TYPES: ["Fixed Deposit"],
  ShieldAlert: icon, SummaryCard: ({ label }) => React.createElement("div", null, label),
  TrendingUp: icon, Unlink: icon, Wallet: icon,
  commitNetWorthSnapshot() {}, computeInvestmentSummary: wealth.investmentSummary,
  computeSavingsSummary: items => wealth.savingsSummary(items, "2026-10-17"),
  formatCurrency: n => `₹${n}`, formatDateDisplay: s => s || "", inputCls: "",
  insertNotification: async () => {}, mfDateToYMD: s => s, mfLatestNav: async () => null,
  mfSearchSchemes: async () => [], nowISO: () => "2026-10-17T00:00:00Z",
  savingsMaturityInfo: item => wealth.maturityInfo(item, "2026-10-17"),
  syncLinkedInvestments: accounts => accounts, todayYMD: () => "2026-10-17", uid: () => "new",
};

function render(settings) {
  const Page = createInvestmentsPage(deps);
  return renderToString(React.createElement(Page, {
    settings, onSaveSettings() {}, userId: null, openTarget: null, onOpenTarget() {},
  }));
}

test("extracted Investments page renders empty holdings and savings", () => {
  const html = render({ investments: [], savingsInstruments: [], netWorthAccounts: [], targetAllocation: {} });
  assert.match(html, /Holdings/);
  assert.match(html, /Savings &amp; Deposits/);
});

test("extracted Investments page renders a holding and savings instrument", () => {
  const html = render({
    investments: [{ id: "fund", name: "Index fund", assetClass: "Equity", purpose: "General",
      currentValue: 12000, costBasis: 10000, dividends: 0 }],
    savingsInstruments: [{ id: "fd", name: "Bank deposit", type: "Fixed Deposit", principal: 5000,
      maturityDate: "2027-01-01", status: "Active", institution: "Local bank" }],
    netWorthAccounts: [], targetAllocation: { Equity: 60 }, investmentHistory: [],
  });
  assert.match(html, /Index fund/);
  assert.match(html, /Bank deposit/);
  assert.match(html, /₹12000/);
});
