import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createLiabilitiesPage } from "../src/features/liabilities/page.js";
import { createDebtStrategyComparison } from "../src/features/liabilities/strategy.js";
import { createDebtPayoffProgress } from "../src/features/liabilities/history.js";

const passthrough = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, Button: passthrough, CalendarClock: icon, Card: passthrough,
  CreditCard: icon, DebtPayoffWhatIf: () => null, EmptyState: ({ title }) => React.createElement("p", null, title),
  IconButton: passthrough, LIABILITY_CATEGORIES: ["Other"], ManageEntryModal: () => null,
  Pencil: icon, Plus: icon, Search: icon, SlidersHorizontal: icon,
  SummaryCard: ({ label }) => React.createElement("div", null, label), TrendingDown: icon,
  Field: passthrough, WhatIfAssumptions: passthrough,
  commitNetWorthSnapshot: () => {}, formatCurrency: n => `₹${n}`,
  formatDateDisplay: s => s || "", inputCls: "", selectCls: "", uid: () => "new",
  nowISO: () => "2026-10-17", liabilityEffectivePayment: a => Number(a.minPayment) || 0,
  liabilityEndStatus: () => ({ tone: "emerald", label: "On track" }),
  liabilityRequiredPayment: a => Number(a.minPayment) || 0,
  liabilityToneClass: () => "",
  simulateDebtStrategy: accounts => ({ neverPaysOff: false, months: 12, totalInterest: 100,
    payoffOrder: accounts.map((a, i) => ({ name: a.name, month: i + 1 })) }),
};

const accounts = [
  { id: "a", name: "Home loan", type: "liability", balance: 500000, interestRate: 7, minPayment: 8000 },
  { id: "b", name: "Car loan", type: "liability", balance: 100000, interestRate: 9, minPayment: 4000 },
];

test("extracted Liabilities overview renders for old empty settings", () => {
  const Page = createLiabilitiesPage(deps);
  const html = renderToString(React.createElement(Page, { settings: {}, onSaveSettings() {} }));
  assert.match(html, /Outstanding debt/);
  assert.match(html, /Add liability/);
  assert.match(html, /Payoff Strategy/);
});

test("extracted Liabilities overview preserves saved loans", () => {
  const Page = createLiabilitiesPage(deps);
  const html = renderToString(React.createElement(Page, { settings: { netWorthAccounts: accounts }, onSaveSettings() {} }));
  assert.match(html, /Home loan/);
  assert.match(html, /Car loan/);
});

test("extracted payoff strategy renders both methods", () => {
  const Strategy = createDebtStrategyComparison(deps);
  const html = renderToString(React.createElement(Strategy, { liabilityAccounts: accounts, onOpenNetWorth() {} }));
  assert.match(html, /Avalanche/);
  assert.match(html, /Snowball/);
});

test("extracted history renders saved liability snapshots", () => {
  const History = createDebtPayoffProgress(deps);
  const html = renderToString(React.createElement(History, { netWorthHistory: [
    { month: "2026-08", liabilitiesTotal: 650000 },
    { month: "2026-09", liabilitiesTotal: 600000 },
  ], onOpenNetWorth() {} }));
  assert.match(html, /paid down/);
  assert.match(html, /total liabilities across all accounts/);
});
