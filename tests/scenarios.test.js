import test from "node:test";
import assert from "node:assert/strict";
import { compareScenario, safeScenarioSummary } from "../src/features/scenarios/calculations.js";

test("scenarios leave saved records intact and compare extra payments", () => {
  const transactions = [{ id: "private-id", merchant: "Private Merchant", date: "2026-09-01", amount: 100, type: "income" }];
  const settings = { netWorthAccounts: [{ id: "private-loan", name: "Private Loan", type: "liability", balance: 1000, interestRate: 0, minPayment: 100 }], goals: [{ id: "private-goal", name: "Private Goal", target: 1000, current: 100, plannedMonthly: 50, dueDate: "2027-10-01" }] };
  const before = JSON.stringify({ transactions, settings });
  const baseline = compareScenario({ transactions, settings, today: "2026-10-22", opening: 500, days: 90, assumptions: { incomePercent: 0, spendingPercent: 0, extraDebt: 0, extraGoal: 0 } });
  const alternative = compareScenario({ transactions, settings, today: "2026-10-22", opening: 500, days: 90, assumptions: { incomePercent: 0, spendingPercent: 0, extraDebt: 50, extraGoal: 25 } });
  assert.ok(alternative.ending < baseline.ending);
  assert.ok(alternative.payoffMonths <= baseline.payoffMonths);
  assert.ok(alternative.goalProjected > baseline.goalProjected);
  assert.ok(alternative.projectedInterest <= baseline.projectedInterest);
  assert.ok(alternative.debtPaidEstimate >= baseline.debtPaidEstimate);
  assert.equal(typeof alternative.projectedNetWorth, "number");
  assert.equal(JSON.stringify({ transactions, settings }), before);
  const summary = safeScenarioSummary([baseline, alternative], 90);
  assert.doesNotMatch(summary, /Private|private-id|private-loan|private-goal/);
  assert.equal(JSON.parse(summary).scenarios.length, 2);
});

test("salary changes affect scheduled income without changing saved salary", () => {
  const settings = { recurring: [{ id: "salary", name: "Employer", type: "income", amount: 1000, nextDate: "2026-10-25", cadence: "monthly", active: true }], subscriptions: [] };
  const before = JSON.stringify(settings);
  const baseline = compareScenario({ transactions: [], settings, today: "2026-10-25", opening: 0, days: 30, assumptions: { incomePercent: 0, spendingPercent: 0, extraDebt: 0, extraGoal: 0 } });
  const raised = compareScenario({ transactions: [], settings, today: "2026-10-25", opening: 0, days: 30, assumptions: { incomePercent: 10, spendingPercent: 0, extraDebt: 0, extraGoal: 0 } });
  assert.equal(raised.ending - baseline.ending, 100);
  assert.equal(JSON.stringify(settings), before);
});

test("extra scenario contributions affect cash on monthly dates", () => {
  const base = { transactions: [], settings: { recurring: [], subscriptions: [] }, today: "2026-10-25", opening: 1000, days: 40 };
  const result = compareScenario({ ...base, assumptions: { incomePercent: 0, spendingPercent: 0, extraDebt: 100, extraGoal: 50 } });
  assert.equal(result.ending, 850);
  assert.equal(result.minimum, 850);
});
