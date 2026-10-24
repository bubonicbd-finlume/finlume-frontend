import test from "node:test";
import assert from "node:assert/strict";
import { confirmTransactionMaintenance } from "../src/features/transactions/confirmed-maintenance.js";

const before = [{ id: "a", category: "Needs review" }, { id: "b", category: "Other" }];
const change = rows => ({
  next: rows.map(row => row.id === "a" ? { ...row, category: "Income" } : row),
  count: rows[0].category === "Needs review" ? 1 : 0,
});

test("maintenance reports success only after a confirmed transaction write", async () => {
  let cloud = structuredClone(before);
  let visible;
  const result = await confirmTransactionMaintenance(change, {
    readTransactions: async () => cloud,
    saveTransactions: async next => { cloud = next; return true; },
    setTransactions: next => { visible = next; },
  });
  assert.equal(result.count, 1);
  assert.equal(visible[0].category, "Income");
  assert.equal(cloud[1].category, "Other");
});

test("failed maintenance refreshes visible rows and rejects success", async () => {
  let visible;
  await assert.rejects(confirmTransactionMaintenance(change, {
    readTransactions: async () => before,
    saveTransactions: async () => false,
    setTransactions: next => { visible = next; },
  }), /not confirmed/);
  assert.equal(visible[0].category, "Needs review");
});

test("maintenance checks the cloud after a lost save response", async () => {
  let cloud = structuredClone(before);
  const result = await confirmTransactionMaintenance(change, {
    readTransactions: async () => cloud,
    saveTransactions: async next => { cloud = next; return false; },
    setTransactions: () => {},
  });
  assert.equal(result.count, 1);
  assert.equal(cloud[0].category, "Income");
});
