import test from "node:test";
import assert from "node:assert/strict";
import { confirmDateRulesChange } from "../src/features/dates/confirmed-rules.js";

const beforeRules = [{ id: "one", name: "Rent" }];
const nextRules = [{ id: "one", name: "New rent" }];
const base = { datesToRemember: beforeRules, theme: "dark" };

test("date rules become visible after a confirmed save", async () => {
  let visible = base;
  await confirmDateRulesChange(beforeRules, nextRules, {
    readSettings: async () => base,
    saveSettings: async () => true,
    setSettings: value => { visible = value; },
  });
  assert.deepEqual(visible.datesToRemember, nextRules);
  assert.equal(visible.theme, "dark");
});

test("a lost response and retry recognize the saved rules", async () => {
  let cloud = base;
  let writes = 0;
  const context = {
    readSettings: async () => cloud,
    saveSettings: async value => { cloud = value; writes++; return false; },
    setSettings: () => {},
  };
  await confirmDateRulesChange(beforeRules, nextRules, context);
  await confirmDateRulesChange(beforeRules, nextRules, context);
  assert.equal(writes, 1);
});

test("an unrelated date change stops the write", async () => {
  let writes = 0;
  await assert.rejects(confirmDateRulesChange(beforeRules, nextRules, {
    readSettings: async () => ({ ...base, datesToRemember: [{ id: "two" }] }),
    saveSettings: async () => { writes++; return true; },
    setSettings: () => {},
  }), /changed elsewhere/);
  assert.equal(writes, 0);
});

test("a rejected date rules save retains the stored rules", async () => {
  let visible;
  await assert.rejects(confirmDateRulesChange(beforeRules, nextRules, {
    readSettings: async () => base,
    saveSettings: async () => false,
    setSettings: value => { visible = value; },
  }), /not confirmed/);
  assert.deepEqual(visible, base);
});
