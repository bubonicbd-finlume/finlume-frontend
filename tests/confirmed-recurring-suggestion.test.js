import test from "node:test";
import assert from "node:assert/strict";
import { confirmRecurringSuggestion } from "../src/features/recurring/confirmed-suggestion.js";

const base = { recurring: [], subscriptions: [], dismissedPatterns: [], nameRules: [], theme: "dark" };
const nextFields = {
  recurring: [{ id: "entry-1", name: "Storage" }],
  dismissedPatterns: ["storage-monthly"],
  nameRules: [{ id: "rule-1", text: "Storage", category: "Bills" }],
};
const beforeFields = { recurring: [], dismissedPatterns: [], nameRules: [] };

test("keeping a suggestion confirms entry, dismissal, and name rule together", async () => {
  let visible = base;
  await confirmRecurringSuggestion(beforeFields, nextFields, {
    readSettings: async () => base,
    saveSettings: async () => true,
    setSettings: value => { visible = value; },
  });
  assert.deepEqual(visible.recurring, nextFields.recurring);
  assert.deepEqual(visible.dismissedPatterns, nextFields.dismissedPatterns);
  assert.deepEqual(visible.nameRules, nextFields.nameRules);
  assert.equal(visible.theme, "dark");
});

test("lost suggestion response does not add duplicate entries on retry", async () => {
  let cloud = base;
  let writes = 0;
  const context = {
    readSettings: async () => cloud,
    saveSettings: async value => { cloud = value; writes++; return false; },
    setSettings: () => {},
  };
  await confirmRecurringSuggestion(beforeFields, nextFields, context);
  await confirmRecurringSuggestion(beforeFields, nextFields, context);
  assert.equal(writes, 1);
});

test("changed suggestion settings block a stale keep", async () => {
  let writes = 0;
  await assert.rejects(confirmRecurringSuggestion(beforeFields, nextFields, {
    readSettings: async () => ({ ...base, recurring: [{ id: "another" }] }),
    saveSettings: async () => { writes++; return true; },
    setSettings: () => {},
  }), /changed elsewhere/);
  assert.equal(writes, 0);
});

test("rejected suggestion write retains the previous list", async () => {
  let visible;
  await assert.rejects(confirmRecurringSuggestion(beforeFields, nextFields, {
    readSettings: async () => base,
    saveSettings: async () => false,
    setSettings: value => { visible = value; },
  }), /not confirmed/);
  assert.deepEqual(visible, base);
});

test("audit dismissal updates only its saved flag list", async () => {
  let visible = { ...base, dismissedAnomalies: [] };
  await confirmRecurringSuggestion({ dismissedAnomalies: [] }, { dismissedAnomalies: ["flag-1"] }, {
    readSettings: async () => visible,
    saveSettings: async value => { visible = value; return true; },
    setSettings: () => {},
  });
  assert.deepEqual(visible.dismissedAnomalies, ["flag-1"]);
  assert.deepEqual(visible.recurring, []);
});
