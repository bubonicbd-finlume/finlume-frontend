import test from "node:test";
import assert from "node:assert/strict";
import { confirmTransactionSplit } from "../src/features/transactions/confirmed-split.js";

const original = { id: "parent", amount: 12.34, category: "Groceries" };
const children = [
  { id: "part-1", amount: 7.34, category: "Groceries" },
  { id: "part-2", amount: 5, category: "Dining" },
];

test("split replaces its original only after the cloud write is confirmed", async () => {
  let visible = [original];
  let saved;
  await confirmTransactionSplit(original.id, children, {
    readTransactions: async () => [original],
    saveTransactions: async rows => { saved = rows; return true; },
    setTransactions: rows => { visible = rows; },
    expectedOriginal: original,
  });
  assert.deepEqual(saved, children);
  assert.deepEqual(visible, children);
});

test("lost split response is reconciled without writing duplicate parts", async () => {
  let cloud = [original];
  let writes = 0;
  const context = {
    readTransactions: async () => cloud,
    saveTransactions: async rows => { writes++; cloud = rows; return false; },
    setTransactions: () => {},
    expectedOriginal: original,
  };
  await confirmTransactionSplit(original.id, children, context);
  await confirmTransactionSplit(original.id, children, context);
  assert.equal(writes, 1);
  assert.deepEqual(cloud, children);
});

test("rejected split leaves the original and reports failure", async () => {
  let visible = [original];
  await assert.rejects(confirmTransactionSplit(original.id, children, {
    readTransactions: async () => [original],
    saveTransactions: async () => false,
    setTransactions: rows => { visible = rows; },
    expectedOriginal: original,
  }), /not confirmed/);
  assert.deepEqual(visible, [original]);
});

test("split refuses a changed original before writing", async () => {
  let writes = 0;
  await assert.rejects(confirmTransactionSplit(original.id, children, {
    readTransactions: async () => [{ ...original, amount: 13 }],
    saveTransactions: async () => { writes++; return true; },
    setTransactions: () => {},
    expectedOriginal: original,
  }), /changed elsewhere/);
  assert.equal(writes, 0);
});
