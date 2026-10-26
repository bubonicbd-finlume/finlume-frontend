import test from "node:test";
import assert from "node:assert/strict";
import { applyLiabilityAdjustment, orderedLiabilities } from "../src/features/liabilities/adjustments.js";

test("manual liability adjustments preserve an audit trail and never create negative debt", () => {
  const raised = applyLiabilityAdjustment({ balance: 100, adjustments: [] }, 25, "Fee", "2026-10-26T00:00:00Z"); assert.equal(raised.balance, 125); assert.equal(raised.adjustments[0].note, "Fee");
  const cleared = applyLiabilityAdjustment(raised, -1000, "Settlement", "2026-10-27T00:00:00Z"); assert.equal(cleared.balance, 0); assert.equal(cleared.adjustments.length, 2);
});

test("liabilities support custom, snowball and avalanche priority", () => {
  const rows = [{ name: "A", balance: 100, interestRate: 5, customPriority: 2 }, { name: "B", balance: 200, interestRate: 10, customPriority: 1 }];
  assert.equal(orderedLiabilities(rows, "custom")[0].name, "B"); assert.equal(orderedLiabilities(rows, "snowball")[0].name, "A"); assert.equal(orderedLiabilities(rows, "avalanche")[0].name, "B");
});
