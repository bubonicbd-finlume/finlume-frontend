import test from "node:test";
import assert from "node:assert/strict";
import { confirmNameRule } from "../src/features/transactions/confirmed-name-rule.js";

test("name rule reports success only after a confirmed settings write", async () => {
  let visible = { nameRules: [] };
  await confirmNameRule("  Market  ", "Groceries", "rule-1", {
    readSettings: async () => ({ nameRules: [] }),
    saveSettings: async () => true,
    setSettings: value => { visible = value; },
  });
  assert.deepEqual(visible.nameRules, [{ id: "rule-1", text: "Market", category: "Groceries" }]);
});

test("lost response and retry do not create a second rule", async () => {
  let cloud = { nameRules: [] };
  let writes = 0;
  const context = {
    readSettings: async () => cloud,
    saveSettings: async value => { writes++; cloud = value; return false; },
    setSettings: () => {},
  };
  await confirmNameRule("Market", "Groceries", "rule-1", context);
  await confirmNameRule("Market", "Groceries", "rule-2", context);
  assert.equal(writes, 1);
  assert.equal(cloud.nameRules.length, 1);
});

test("different existing category is a conflict", async () => {
  await assert.rejects(confirmNameRule("Market", "Dining", "rule-2", {
    readSettings: async () => ({ nameRules: [{ id: "rule-1", text: "market", category: "Groceries" }] }),
    saveSettings: async () => { throw new Error("should not save"); },
    setSettings: () => {},
  }), /different category/);
});

test("rejected rule write keeps the cloud version visible", async () => {
  let visible;
  await assert.rejects(confirmNameRule("Market", "Groceries", "rule-1", {
    readSettings: async () => ({ nameRules: [] }),
    saveSettings: async () => false,
    setSettings: value => { visible = value; },
  }), /not confirmed/);
  assert.deepEqual(visible.nameRules, []);
});
