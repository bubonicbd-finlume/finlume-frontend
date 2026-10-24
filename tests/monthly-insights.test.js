import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyInsights } from "../src/features/financial-review/monthly-insights.js";

test("monthly review compares net spending and identifies category actions", () => {
  const result = buildMonthlyInsights([
    { date: "2026-09-10", type: "expense", amount: 50, category: "Groceries" },
    { date: "2026-10-10", type: "expense", amount: 100, category: "Groceries" },
    { date: "2026-10-11", type: "income", amount: 20, category: "Groceries", tags: ["Refund"] },
    { date: "2026-10-12", type: "expense", amount: 500, category: "Transfer - Own Accounts" },
    { date: "2026-10-13", type: "expense", amount: 10, category: "Needs review" }
  ], "2026-10");
  assert.equal(result.current.spending, 90);
  assert.equal(result.spendingChange, 40);
  assert.deepEqual(result.topCategory, { name: "Groceries", amount: 80 });
  assert.deepEqual(result.categoryIncrease, { name: "Groceries", amount: 30 });
  assert.equal(result.needsReview, 1);
});
