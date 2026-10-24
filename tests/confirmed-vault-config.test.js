import test from "node:test";
import assert from "node:assert/strict";
import { confirmVaultConfigChange } from "../src/features/settings/confirmed-vault-config.js";

const config = { version: 2, salt: "test" };

test("vault setting becomes visible only after confirmed save", async () => {
  let shown;
  await confirmVaultConfigChange({
    readSettings: async () => ({ currency: "INR", vaultConfig: null }),
    saveSettings: async next => { assert.equal(shown, undefined); assert.equal(next.currency, "INR"); return true; },
    setSettings: value => { shown = value; }, config,
  });
  assert.deepEqual(shown.vaultConfig, config);
});

test("vault setting recovers a committed write whose response was lost", async () => {
  let reads = 0;
  const result = await confirmVaultConfigChange({
    readSettings: async () => ++reads === 1 ? { vaultConfig: null } : { vaultConfig: config },
    saveSettings: async () => false, setSettings: () => {}, config,
  });
  assert.equal(reads, 2);
  assert.deepEqual(result.vaultConfig, config);
});

test("failed vault setting never claims success", async () => {
  let shown;
  await assert.rejects(confirmVaultConfigChange({
    readSettings: async () => ({ vaultConfig: null }), saveSettings: async () => false,
    setSettings: value => { shown = value; }, config,
  }), /not saved/);
  assert.equal(shown.vaultConfig, null);
});
