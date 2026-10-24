import test from "node:test";
import assert from "node:assert/strict";
import { confirmRestoreRows, confirmRestoreSettings, restoreSettingsPatch, checkRestoredDocuments } from "../src/features/settings/confirmed-restore.js";

const saved = [{ id: "a", amount: 1 }];
const imported = [{ id: "b", amount: 2 }];

test("merge restore waits for cloud confirmation and skips saved IDs on retry", async () => {
  let cloud = saved;
  let shown;
  const opts = { readRows: async () => cloud, saveRows: async next => { assert.equal(shown, undefined); cloud = next; return true; }, setRows: rows => { shown = rows; }, mode: "merge", incoming: imported };
  assert.equal(await confirmRestoreRows(opts), 1);
  assert.deepEqual(cloud, [...saved, ...imported]);
  assert.equal(await confirmRestoreRows(opts), 0);
});

test("lost restore response is checked against the cloud", async () => {
  let reads = 0;
  const result = await confirmRestoreRows({ readRows: async () => ++reads === 1 ? saved : [...saved, ...imported], saveRows: async () => false, setRows: () => {}, mode: "merge", incoming: imported });
  assert.equal(result, 1);
  assert.equal(reads, 2);
});

test("failed replace does not claim a restored collection", async () => {
  let shown;
  await assert.rejects(confirmRestoreRows({ readRows: async () => saved, saveRows: async () => false, setRows: rows => { shown = rows; }, mode: "replace", incoming: imported }), /not confirmed/);
  assert.deepEqual(shown, saved);
});

test("settings restore requires a confirmed patch", async () => {
  let shown;
  await assert.rejects(confirmRestoreSettings({ readSettings: async () => ({ currency: "INR" }), saveSettings: async () => false, setSettings: value => { shown = value; }, patch: { currency: "USD" } }), /not confirmed/);
  assert.equal(shown.currency, "INR");
});

test("merging settings preserves the current vault configuration", () => {
  assert.deepEqual(restoreSettingsPatch({ currency: "USD", vaultConfig: { salt: "old" } }, { mode: "merge", withDocuments: true }), { currency: "USD" });
  assert.deepEqual(restoreSettingsPatch({ currency: "USD", vaultConfig: { salt: "old" } }, { mode: "replace", withDocuments: true }), { currency: "USD", vaultConfig: { salt: "old" } });
});

test("encrypted document restore requires a usable vault configuration", () => {
  const incoming = [{ id: "d", encrypted: "cipher" }];
  assert.throws(() => checkRestoredDocuments({ incoming, backupSettings: { vaultConfig: { salt: "old" } }, currentSettings: { vaultConfig: { salt: "new" } }, mode: "merge", withSettings: true }), /different vault settings/);
  assert.throws(() => checkRestoredDocuments({ incoming, backupSettings: { vaultConfig: { salt: "old" } }, currentSettings: {}, mode: "replace", withSettings: false }), /Select settings/);
  assert.doesNotThrow(() => checkRestoredDocuments({ incoming, backupSettings: { vaultConfig: { salt: "old" } }, currentSettings: {}, mode: "replace", withSettings: true }));
});
