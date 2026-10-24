import test from "node:test";
import assert from "node:assert/strict";
import { confirmSettingsFieldsChange } from "../src/platform/confirmed-settings-fields.js";

const messages = { changed: "changed", uncertain: "uncertain", failed: "failed" };

test("keyword updates preserve other settings and confirm a lost response", async () => {
  let cloud = { categoryKeywords: { Dining: ["Cafe"] }, theme: "dark" };
  let visible;
  await confirmSettingsFieldsChange(
    { categoryKeywords: { Dining: ["Cafe"] } },
    { categoryKeywords: { Dining: ["Cafe", "Bakery"] } },
    { allowedKeys: ["categoryKeywords"], messages,
      readSettings: async () => cloud,
      saveSettings: async next => { cloud = next; return false; },
      setSettings: next => { visible = next; } },
  );
  assert.deepEqual(visible.categoryKeywords.Dining, ["Cafe", "Bakery"]);
  assert.equal(cloud.theme, "dark");
});

test("subcategory changes refuse a stale list", async () => {
  let saved = false;
  await assert.rejects(confirmSettingsFieldsChange(
    { subcategories: { Groceries: ["Produce"] } },
    { subcategories: { Groceries: ["Produce", "Organic"] } },
    { allowedKeys: ["subcategories"], messages,
      readSettings: async () => ({ subcategories: { Groceries: ["Produce", "Dairy"] } }),
      saveSettings: async () => { saved = true; return true; },
      setSettings: () => {} },
  ), /changed/);
  assert.equal(saved, false);
});

test("advanced rule creation recognizes the same prepared rule after a lost response", async () => {
  const rule = { id: "rule-1", whenText: "Cafe", thenText: "Dining", enabled: true };
  let cloud = { rules: [], theme: "dark" };
  const options = { allowedKeys: ["rules"], messages,
    readSettings: async () => cloud,
    saveSettings: async next => { cloud = next; return false; },
    setSettings: () => {} };
  await confirmSettingsFieldsChange({ rules: [] }, { rules: [rule] }, options);
  await confirmSettingsFieldsChange({ rules: [] }, { rules: [rule] }, options);
  assert.deepEqual(cloud.rules, [rule]);
  assert.equal(cloud.theme, "dark");
});

test("name rule removal keeps the cloud list when the save fails", async () => {
  const rule = { id: "name-1", text: "Cafe", category: "Dining" };
  const cloud = { nameRules: [rule], theme: "dark" };
  let visible;
  await assert.rejects(confirmSettingsFieldsChange(
    { nameRules: [rule] }, { nameRules: [] },
    { allowedKeys: ["nameRules"], messages,
      readSettings: async () => cloud,
      saveSettings: async () => false,
      setSettings: next => { visible = next; } },
  ), /failed/);
  assert.deepEqual(visible.nameRules, [rule]);
});
