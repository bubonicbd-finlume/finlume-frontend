import test from "node:test";
import assert from "node:assert/strict";
import { confirmMonthlyPlanIncome } from "../src/features/budgets/confirmed-income-plan.js";

const base = { monthlyPlanIncome: 1000, theme: "dark" };

test("money plan income waits for cloud confirmation", async () => {
  let visible = base;
  await confirmMonthlyPlanIncome(1000, 1200, {
    readSettings: async () => base,
    saveSettings: async () => true,
    setSettings: value => { visible = value; },
  });
  assert.equal(visible.monthlyPlanIncome, 1200);
  assert.equal(visible.theme, "dark");
});

test("lost money plan response and retry use the saved value", async () => {
  let cloud = base;
  let writes = 0;
  const context = {
    readSettings: async () => cloud,
    saveSettings: async value => { cloud = value; writes++; return false; },
    setSettings: () => {},
  };
  await confirmMonthlyPlanIncome(1000, 1200, context);
  await confirmMonthlyPlanIncome(1000, 1200, context);
  assert.equal(writes, 1);
});

test("changed money plan stops a stale write", async () => {
  let writes = 0;
  await assert.rejects(confirmMonthlyPlanIncome(1000, 1200, {
    readSettings: async () => ({ ...base, monthlyPlanIncome: 1500 }),
    saveSettings: async () => { writes++; return true; },
    setSettings: () => {},
  }), /changed elsewhere/);
  assert.equal(writes, 0);
});

test("rejected money plan write keeps its previous value", async () => {
  let visible;
  await assert.rejects(confirmMonthlyPlanIncome(1000, 1200, {
    readSettings: async () => base,
    saveSettings: async () => false,
    setSettings: value => { visible = value; },
  }), /not confirmed/);
  assert.deepEqual(visible, base);
});
