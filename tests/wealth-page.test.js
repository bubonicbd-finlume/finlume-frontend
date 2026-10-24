import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createWealthPage } from "../src/features/wealth/page.js";

const deps = {
  Card: ({ children }) => React.createElement("div", null, children),
  EmptyState: ({ title }) => React.createElement("p", null, title),
  GoalsPage: ({ settings }) => React.createElement("div", null,
    ...(settings.goals || []).map(goal => React.createElement("span", { key: goal.id }, goal.name))),
  TrendingUp: () => null,
  budgetShiftMonth: (month, offset) => {
    const [year, value] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, value - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  },
  budgetSpendIndex: () => new Map(),
  computeCombinedNetWorth: () => ({ assets: 120000, liabilities: 20000, net: 100000,
    accountAssets: 60000, investmentsValue: 40000, savingsValue: 20000 }),
  formatCurrency: n => `₹${n}`,
  parseYMD: value => new Date(`${value}T00:00:00`),
  todayYMD: () => "2026-10-17",
};

function render(settings) {
  const Page = createWealthPage(deps);
  return renderToString(React.createElement(Page, {
    settings, transactions: [], onGoTo() {}, onOpenNetWorth() {}, onSaveSettings() {},
  }));
}

test("extracted Wealth page accepts older total-only settings", () => {
  const html = render({ assetsTotal: 50000, liabilitiesTotal: 10000, netWorthHistory: [], goals: [] });
  assert.match(html, /Net worth/);
  assert.match(html, /₹40000/);
});

test("extracted Wealth page renders combined assets and goal summary", () => {
  const html = render({
    netWorthAccounts: [{ id: "cash", type: "asset", balance: 60000 }],
    investments: [{ id: "fund", value: 40000 }], savingsInstruments: [],
    goals: [{ id: "emergency", name: "Emergency fund", current: 10000, target: 30000, isEmergencyFund: true }],
    netWorthHistory: [{ month: "2026-09", netWorth: 90000 }, { month: "2026-10", netWorth: 100000 }],
  });
  assert.match(html, /₹100000/);
  assert.match(html, /Emergency fund/);
  assert.match(html, /Accounts &amp; other assets/);
});
