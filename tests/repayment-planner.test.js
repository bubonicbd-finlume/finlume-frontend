import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { RepaymentPlanner } from "../src/features/liabilities/repayment-planner.js";
import { amortizationSchedule } from "../src/features/liabilities/calculations.js";

test("repayment planner renders a complete schedule with payoff assumptions", () => {
  const html = renderToString(React.createElement(RepaymentPlanner, {
    accounts: [{ id: "loan", name: "Test loan", type: "liability", balance: 1200, interestRate: 0, minPayment: 100 }],
    today: "2026-10-17",
    formatCurrency: value => `₹${value.toFixed(2)}`
  }));
  assert.match(html, /Test loan/);
  assert.match(html, /12 months/);
  assert.match(html, /Principal/);
  assert.match(html, /₹0.00/);
  assert.match(html, /One-time early repayment/);
});

test("one-time early repayment reduces principal once and saves interest", () => {
  const loan = { balance: 1200, interestRate: 12, minPayment: 110 };
  const baseline = amortizationSchedule(loan, "2026-10-25");
  const early = amortizationSchedule(loan, "2026-10-25", { oneTimePayments: { 2: 300 } });
  assert.equal(early.rows[0].payment, baseline.rows[0].payment);
  assert.equal(early.rows[1].payment, baseline.rows[1].payment + 300);
  assert.ok(early.months < baseline.months);
  assert.ok(early.totalInterest < baseline.totalInterest);
  assert.equal(early.remainingBalance, 0);
});
