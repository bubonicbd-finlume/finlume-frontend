import test from "node:test";
import assert from "node:assert/strict";
import { holdingCashFlows, holdingPerformance, singlePurchaseAnnualizedReturn, xirr } from "../src/features/investments/returns.js";

test("XIRR uses dated cash flows and ACT/365", () => {
  assert.ok(Math.abs(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2026-01-01", amount: 1100 }]) - 0.1) < 1e-7);
  assert.ok(Math.abs(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2025-07-02", amount: -500 }, { date: "2026-01-01", amount: 1700 }]) - 0.1611) < 0.001);
  assert.equal(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2025-01-01", amount: 1100 }]), null);
  assert.equal(xirr([{ date: "2025-01-01", amount: -1000 }, { date: "2026-01-01", amount: 1100 }, { date: "2027-01-01", amount: -100 }]), null);
});

test("holding performance separates fees, realized and unrealized returns and supports dated flows", () => {
  const holding = { purchaseDate: "2025-01-01", costBasis: 1000, fees: 10, currentValue: 1200, withdrawals: 100, dividends: 20, withdrawnCostBasis: 80 };
  const performance = holdingPerformance(holding, "2026-01-01");
  assert.equal(performance.unrealized, 200); assert.equal(performance.realized, 30); assert.equal(performance.absoluteReturn, 310); assert.ok(performance.xirr > 0);
  assert.equal(holdingCashFlows({ cashFlows: [{ date: "2025-01-01", amount: -500 }], currentValue: 600 }, "2026-01-01").length, 2);
});

test("single-purchase annualized return requires a dated lump sum", () => {
  assert.ok(Math.abs(singlePurchaseAnnualizedReturn({ purchaseDate: "2025-01-01", costBasis: 1000, currentValue: 1100 }, "2026-01-01") - 0.1) < 1e-7);
  assert.equal(singlePurchaseAnnualizedReturn({ costBasis: 1000, currentValue: 1100 }, "2026-01-01"), null);
  assert.equal(singlePurchaseAnnualizedReturn({ purchaseDate: "2025-01-01", costBasis: 1000, currentValue: 1100, isSip: true }, "2026-01-01"), null);
});
