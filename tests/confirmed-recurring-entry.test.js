import test from "node:test";
import assert from "node:assert/strict";
import { confirmRecurringEntryChange } from "../src/features/recurring/confirmed-entry.js";

const oldEntries = [{ id: "one", amount: 100 }];
const nextEntries = [{ id: "one", amount: 120 }];
const base = { recurring: oldEntries, subscriptions: [], theme: "dark" };

test("recurring entry waits for a confirmed settings write", async () => {
  let visible = base;
  await confirmRecurringEntryChange("recurring", oldEntries, nextEntries, {
    readSettings: async () => base,
    saveSettings: async () => true,
    setSettings: value => { visible = value; },
  });
  assert.deepEqual(visible.recurring, nextEntries);
  assert.deepEqual(visible.subscriptions, []);
});

test("subscription retry recognizes a saved response", async () => {
  let cloud = base;
  let writes = 0;
  const context = {
    readSettings: async () => cloud,
    saveSettings: async value => { cloud = value; writes++; return false; },
    setSettings: () => {},
  };
  await confirmRecurringEntryChange("subscriptions", [], nextEntries, context);
  await confirmRecurringEntryChange("subscriptions", [], nextEntries, context);
  assert.equal(writes, 1);
});

test("changed recurring list stops a stale write", async () => {
  let writes = 0;
  await assert.rejects(confirmRecurringEntryChange("recurring", oldEntries, nextEntries, {
    readSettings: async () => ({ ...base, recurring: [] }),
    saveSettings: async () => { writes++; return true; },
    setSettings: () => {},
  }), /changed elsewhere/);
  assert.equal(writes, 0);
});

test("rejected recurring save retains its previous value", async () => {
  let visible;
  await assert.rejects(confirmRecurringEntryChange("recurring", oldEntries, nextEntries, {
    readSettings: async () => base,
    saveSettings: async () => false,
    setSettings: value => { visible = value; },
  }), /not confirmed/);
  assert.deepEqual(visible, base);
});
