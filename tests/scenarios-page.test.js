import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createScenarioPage } from "../src/features/scenarios/page.js";

test("scenario workspace renders account-saved scenarios and edit controls", () => {
  const Page = createScenarioPage({ Card: ({ children }) => React.createElement("div", null, children), formatCurrency: value => `₹${value.toFixed(2)}`, frLiquidBalance: () => 0, hasSystemTag: () => false, isSelfTransfer: () => false, monthlyEquivalent: value => value, normalizeMerchant: value => value, todayYMD: () => "2026-10-25" });
  const html = renderToString(React.createElement(Page, { transactions: [], settings: { recurring: [], subscriptions: [], savedScenarios: [{ id: "a", name: "Early retirement", incomePercent: 10, spendingPercent: 0, extraDebt: 0, extraGoal: 0 }] }, onGoTo() {}, onConfirmScenarioChange() {} }));
  assert.match(html, /Early retirement/);
  assert.match(html, /Save scenarios/);
  assert.match(html, /Duplicate/);
  assert.match(html, /Remove/);
});
