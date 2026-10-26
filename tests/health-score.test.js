import test from "node:test";
import assert from "node:assert/strict";
import { financialHealthScore, financialHealthTrend } from "../src/features/dashboard/health-score.js";

test("financial health requires actual income and spending", () => {
  assert.equal(financialHealthScore({ monthlyIncome: 0, monthlySpending: 0 }).score, null);
  assert.equal(financialHealthScore({ monthlyIncome: 1000, monthlySpending: -1 }).score, null);
});

test("financial health provides narrative factors and month-over-month trend", () => {
  const score = financialHealthScore({ monthlyIncome: 10000, monthlySpending: 9500, monthlyDebt: 3500 });
  assert.ok(score.attention.length > 0);
  assert.ok(Array.isArray(score.positives));
  const trend = financialHealthTrend({ transactions: [
    { date: "2026-08-01", type: "income", amount: 10000 }, { date: "2026-08-02", type: "expense", amount: 9000 },
    { date: "2026-09-01", type: "income", amount: 10000 }, { date: "2026-09-02", type: "expense", amount: 7000 }
  ], monthlyDebt: 0 });
  assert.equal(trend.length, 2);
  assert.ok(trend[1].score > trend[0].score);
});

test("financial health documents weighted factors and excludes missing optional data", () => {
  const full = financialHealthScore({ monthlyIncome: 10000, monthlySpending: 8000, monthlyDebt: 0, liquidAssets: 48000, goals: [{ target: 10000, current: 10000 }] });
  assert.equal(full.score, 100);
  assert.equal(full.coverageWeight, 100);
  assert.deepEqual(full.factors.map(factor => factor.weight), [25, 15, 20, 20, 20]);
  const partial = financialHealthScore({ monthlyIncome: 10000, monthlySpending: 9000, monthlyDebt: 3000 });
  assert.equal(partial.factors.length, 3);
  assert.equal(partial.coverageWeight, 60);
  assert.ok(partial.score >= 0 && partial.score <= 100);
  assert.equal(partial.weakest.key, "debt");
  assert.match(partial.suggestion, /debt/i);
});
