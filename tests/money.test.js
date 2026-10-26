import test from "node:test";
import assert from "node:assert/strict";
import { fromMinor, sumMoney, toMinor } from "../src/platform/money.js";
import { combinedNetWorth, investmentSummary } from "../src/features/wealth/calculations.js";

test("money conversion rounds decimal strings exactly to minor units", () => {
  assert.equal(toMinor("1.005"), 101);
  assert.equal(toMinor("-1.005"), -101);
  assert.equal(toMinor("0.01"), 1);
  assert.equal(fromMinor(101), 1.01);
  assert.equal(sumMoney(["0.1", "0.2"]), 0.3);
  assert.throws(() => toMinor("not money"));
});

test("wealth totals avoid floating-point residue", () => {
  const investments = [{ currentValue: 0.1, costBasis: 0.1 }, { currentValue: 0.2, costBasis: 0.1 }];
  assert.equal(investmentSummary(investments).totalCurrentValue, 0.3);
  assert.equal(combinedNetWorth({ netWorthAccounts: [{ type: "asset", balance: 0.1 }, { type: "asset", balance: 0.2 }], investments: [], savingsInstruments: [] }, "2026-10-25").assets, 0.3);
});
