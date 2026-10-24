import test from "node:test";
import assert from "node:assert/strict";
import { confirmTransactionDelete, confirmTransactionUndo } from "../src/features/transactions/confirmed-delete.js";

const rows = [{ id: "a" }, { id: "b" }];

test("transaction delete changes the screen only after cloud confirmation", async () => {
  let shown;
  const removed = await confirmTransactionDelete(["a"], { readTransactions: async () => rows, saveTransactions: async next => { assert.equal(shown, undefined); assert.deepEqual(next, [rows[1]]); return true; }, setTransactions: value => { shown = value; } });
  assert.deepEqual(removed, [rows[0]]);
  assert.deepEqual(shown, [rows[1]]);
});

test("failed transaction delete retains cloud rows and refuses success", async () => {
  let shown;
  await assert.rejects(confirmTransactionDelete(["a"], { readTransactions: async () => rows, saveTransactions: async () => false, setTransactions: value => { shown = value; } }), /not confirmed/);
  assert.deepEqual(shown, rows);
});

test("lost delete response is reconciled before offering Undo", async () => {
  let reads = 0;
  const removed = await confirmTransactionDelete(["a"], { readTransactions: async () => ++reads === 1 ? rows : [rows[1]], saveTransactions: async () => false, setTransactions: () => {} });
  assert.equal(reads, 2);
  assert.deepEqual(removed, [rows[0]]);
});

test("Undo skips a row already restored by a previous attempt", async () => {
  let writes = 0;
  await confirmTransactionUndo([rows[0]], { readTransactions: async () => rows, saveTransactions: async () => { writes++; return true; }, setTransactions: () => {} });
  assert.equal(writes, 0);
});
