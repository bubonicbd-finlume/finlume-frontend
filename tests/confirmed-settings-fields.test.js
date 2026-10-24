import test from "node:test";
import assert from "node:assert/strict";
import { confirmSettingsFieldsChange } from "../src/platform/confirmed-settings-fields.js";

const options = {
  allowedKeys: ["budgets"],
  messages: { changed: "changed elsewhere", uncertain: "uncertain save", failed: "failed save" },
  readSettings: async () => ({ budgets: [], theme: "dark" }),
  saveSettings: async () => true,
  setSettings: () => {},
};

test("shared settings confirmation rejects fields outside the caller's allowlist", async () => {
  await assert.rejects(confirmSettingsFieldsChange({ budgets: [] }, { adminRole: ["owner"] }, options), /Unknown settings change/);
});

test("shared settings confirmation requires a baseline for every changed field", async () => {
  await assert.rejects(confirmSettingsFieldsChange({}, { budgets: [{ id: "one" }] }, options), /Unknown settings change/);
});

test("a list edit confirms the cloud write before publishing the new list", async () => {
  let cloud = { categories: ["Food"], theme: "dark" };
  let displayed = cloud;
  await confirmSettingsFieldsChange(
    { categories: ["Food"] }, { categories: ["Food", "Travel"] }, {
      ...options,
      allowedKeys: ["categories"],
      readSettings: async () => cloud,
      saveSettings: async next => { cloud = next; return true; },
      setSettings: next => { displayed = next; },
    },
  );
  assert.deepEqual(displayed.categories, ["Food", "Travel"]);
  assert.equal(displayed.theme, "dark");
});

test("a rejected list write leaves the old list visible", async () => {
  const cloud = { categories: ["Food"] };
  let displayed = cloud;
  await assert.rejects(confirmSettingsFieldsChange(
    { categories: ["Food"] }, { categories: ["Food", "Travel"] }, {
      ...options,
      allowedKeys: ["categories"],
      readSettings: async () => cloud,
      saveSettings: async () => false,
      setSettings: next => { displayed = next; },
    },
  ), /failed save/);
  assert.deepEqual(displayed.categories, ["Food"]);
});

test("shared settings confirmation preserves false values", async () => {
  let cloud = { highContrast: false, theme: "light" };
  await confirmSettingsFieldsChange({ highContrast: false }, { highContrast: true }, {
    ...options,
    allowedKeys: ["highContrast"],
    readSettings: async () => cloud,
    saveSettings: async next => { cloud = next; return true; },
  });
  assert.equal(cloud.highContrast, true);
  assert.equal(cloud.theme, "light");
});

test("shared settings confirmation accepts a zero numeric baseline", async () => {
  let cloud = { subscriptionCreepThreshold: 0 };
  await confirmSettingsFieldsChange(
    { subscriptionCreepThreshold: 0 }, { subscriptionCreepThreshold: 250 }, {
      ...options,
      allowedKeys: ["subscriptionCreepThreshold"],
      readSettings: async () => cloud,
      saveSettings: async next => { cloud = next; return true; },
    },
  );
  assert.equal(cloud.subscriptionCreepThreshold, 250);
});
