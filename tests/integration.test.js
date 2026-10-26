import test from "node:test";
import assert from "node:assert/strict";
import { applyGoalAllocation, applyInvestmentFunding, splitLoanPayment } from "../src/finance/integration.js";

test("investment funding moves value from cash without creating income or expense", () => {
  const accounts = [{ name: "Cash", type: "asset", balance: 1000 }];
  assert.equal(applyInvestmentFunding(accounts, null, { fundingAccount: "Cash", costBasis: 250 })[0].balance, 750);
  assert.equal(applyInvestmentFunding([{ ...accounts[0], balance: 750 }], { fundingAccount: "Cash", costBasis: 250 }, { fundingAccount: "Cash", costBasis: 300 })[0].balance, 700);
});

test("goal allocation is idempotent and preserves total net worth", () => {
  const state = { accounts: [{ name: "Cash", type: "asset", balance: 1000 }], goals: [{ id: "g", current: 100 }] };
  const once = applyGoalAllocation(state, { goalId: "g", fundingAccount: "Cash", amount: 200, allocationId: "a1", date: "2026-10-26" });
  const twice = applyGoalAllocation(once, { goalId: "g", fundingAccount: "Cash", amount: 200, allocationId: "a1", date: "2026-10-26" });
  assert.equal(once.accounts[0].balance, 800); assert.equal(once.goals[0].current, 300); assert.deepEqual(twice, once);
});

test("loan payment separates interest and principal", () => {
  assert.deepEqual(splitLoanPayment({ balance: 1000, payment: 120, monthlyRate: 0.01, fees: 5 }), { principal: 105, interest: 10, fees: 5, nextBalance: 895 });
});
