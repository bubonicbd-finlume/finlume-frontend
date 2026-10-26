import test from "node:test";
import assert from "node:assert/strict";
import { liabilityOverviewMetrics } from "../src/features/liabilities/overview-metrics.js";

test("liability outlook uses saved payments and completed-month income", () => {
  const result = liabilityOverviewMetrics([{ id: "loan", type: "liability", category: "Education", balance: 1200, interestRate: 0, minPayment: 100 }], [{ date: "2026-09-01", type: "income", amount: 1000 }], "2026-10-25");
  assert.equal(result.monthlyPayment, 100);
  assert.equal(result.paymentToIncomePct, 10);
  assert.equal(result.remainingInterest, 0);
  assert.equal(result.debtFreeDate, "2027-10-25");
  assert.deepEqual(result.categories, [{ name: "Education", value: 1200 }]);
});

test("liability outlook marks interest and payoff unavailable when payment cannot amortize", () => {
  const result = liabilityOverviewMetrics([{ type: "liability", balance: 10000, interestRate: 24, minPayment: 100 }], [], "2026-10-25");
  assert.equal(result.remainingInterest, null);
  assert.equal(result.debtFreeDate, null);
  assert.equal(result.paymentToIncomePct, null);
});
