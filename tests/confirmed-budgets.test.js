import test from "node:test";
import assert from "node:assert/strict";
import { confirmBudgetsChange } from "../src/features/budgets/confirmed-budgets.js";

const oldBudgets = [{ id: "one", category: "Food", limit: 100 }];
const newBudgets = [{ id: "one", category: "Food", limit: 120 }];
const base = { budgets: oldBudgets, theme: "dark" };

test("manual budget change waits for cloud confirmation", async () => {
  let visible = base;
  await confirmBudgetsChange(oldBudgets, newBudgets, {
    readSettings: async () => base,
    saveSettings: async () => true,
    setSettings: value => { visible = value; },
  });
  assert.deepEqual(visible.budgets, newBudgets);
  assert.equal(visible.theme, "dark");
});

test("lost budget save response is recognized without a second write", async () => {
  let cloud = base;
  let writes = 0;
  const context = {
    readSettings: async () => cloud,
    saveSettings: async value => { cloud = value; writes++; return false; },
    setSettings: () => {},
  };
  await confirmBudgetsChange(oldBudgets, newBudgets, context);
  await confirmBudgetsChange(oldBudgets, newBudgets, context);
  assert.equal(writes, 1);
});

test("stale budget list stops before writing", async () => {
  let writes = 0;
  await assert.rejects(confirmBudgetsChange(oldBudgets, newBudgets, {
    readSettings: async () => ({ ...base, budgets: [] }),
    saveSettings: async () => { writes++; return true; },
    setSettings: () => {},
  }), /changed elsewhere/);
  assert.equal(writes, 0);
});

test("rejected budget write retains cloud state", async () => {
  let visible;
  await assert.rejects(confirmBudgetsChange(oldBudgets, newBudgets, {
    readSettings: async () => base,
    saveSettings: async () => false,
    setSettings: value => { visible = value; },
  }), /not confirmed/);
  assert.deepEqual(visible, base);
});
