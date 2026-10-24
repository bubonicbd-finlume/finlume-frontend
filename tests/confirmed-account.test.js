import test from "node:test";
import assert from "node:assert/strict";
import { confirmImportAccount } from "../src/features/transactions/confirmed-account.js";

const original = { accounts: ["Checking"], accountTypes: { Checking: "primary" }, currency: "INR" };

test("new import account advances only after a confirmed settings write", async () => {
  let applied;
  const name = await confirmImportAccount("Savings", "savings", {
    readSettings: async () => original,
    saveSettings: async next => {
      assert.equal(applied, undefined);
      assert.deepEqual(next.accounts, ["Checking", "Savings"]);
      assert.equal(next.accountTypes.Savings, "savings");
      assert.equal(next.currency, "INR");
      return true;
    },
    setSettings: value => { applied = value; },
  });
  assert.equal(name, "Savings");
  assert.equal(applied.accountTypes.Checking, "primary");
});

test("an existing import account is reused without another write", async () => {
  let writes = 0;
  await confirmImportAccount("Checking", "other", {
    readSettings: async () => original,
    saveSettings: async () => { writes++; return true; },
    setSettings: () => {},
  });
  assert.equal(writes, 0);
});

test("new account can recover a cloud commit whose response was lost", async () => {
  let reads = 0;
  let applied;
  await confirmImportAccount("Savings", "savings", {
    readSettings: async () => ++reads === 1 ? original : { ...original, accounts: ["Checking", "Savings"], accountTypes: { ...original.accountTypes, Savings: "savings" } },
    saveSettings: async () => false,
    setSettings: value => { applied = value; },
  });
  assert.equal(reads, 2);
  assert.deepEqual(applied.accounts, ["Checking", "Savings"]);
});

test("failed new account save leaves import blocked and retryable", async () => {
  let applied;
  await assert.rejects(confirmImportAccount("Savings", "savings", {
    readSettings: async () => original,
    saveSettings: async () => false,
    setSettings: value => { applied = value; },
  }), /not saved/);
  assert.deepEqual(applied, original);
});
