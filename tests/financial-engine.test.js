import test from "node:test";
import assert from "node:assert/strict";
import { annualRateToPeriodic, cashFlowSummary, inflationAdjusted, moneyAdd, moneyMultiply, percentage, uniqueTransactions } from "../src/finance/engine.js";

test("central financial engine uses minor units and safe ratios", () => {
  assert.equal(moneyAdd(0.1, 0.2), 0.3); assert.equal(moneyMultiply(10.01, 1.5), 15.02);
  assert.equal(percentage(1, 4), 25); assert.equal(percentage(1, 0), null); assert.equal(annualRateToPeriodic(12), 0.01); assert.equal(inflationAdjusted(100, 10, 2), 121);
});

test("cash flow ignores duplicate transactions and handles negative flow", () => {
  const tx = [{ id: "a", date: "2026-01-01", type: "income", amount: 100, account: "A", merchant: "Pay" }, { id: "a", date: "2026-01-01", type: "income", amount: 100, account: "A", merchant: "Pay" }, { id: "b", date: "2026-01-02", type: "expense", amount: 125, account: "A", merchant: "Shop" }];
  assert.equal(uniqueTransactions(tx).length, 2); assert.deepEqual(cashFlowSummary(tx), { income: 100, expenses: 125, net: -25, savingsRate: -25 });
});
