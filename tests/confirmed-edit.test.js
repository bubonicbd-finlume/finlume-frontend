import test from "node:test";
import assert from "node:assert/strict";
import { confirmTransactionEdit } from "../src/features/transactions/confirmed-edit.js";

const original = { id: "tx-1", amount: 9, notes: "", category: "Groceries" };
const patch = { notes: "Checked receipt" };

test("transaction edit becomes visible after its cloud write succeeds", async () => {
  let visible = [original];
  await confirmTransactionEdit("tx-1", patch, {
    expectedOriginal: original,
    readTransactions: async () => [original],
    saveTransactions: async () => true,
    setTransactions: rows => { visible = rows; },
  });
  assert.equal(visible[0].notes, "Checked receipt");
});

test("lost edit response is recognized on reread and retry", async () => {
  let cloud = [original];
  let writes = 0;
  const context = {
    expectedOriginal: original,
    readTransactions: async () => cloud,
    saveTransactions: async rows => { writes++; cloud = rows; return false; },
    setTransactions: () => {},
  };
  await confirmTransactionEdit("tx-1", patch, context);
  await confirmTransactionEdit("tx-1", patch, context);
  assert.equal(writes, 1);
});

test("rejected edit leaves the original and reports failure", async () => {
  let visible = [original];
  await assert.rejects(confirmTransactionEdit("tx-1", patch, {
    expectedOriginal: original,
    readTransactions: async () => [original],
    saveTransactions: async () => false,
    setTransactions: rows => { visible = rows; },
  }), /not confirmed/);
  assert.deepEqual(visible, [original]);
});

test("edit refuses to overwrite a changed transaction", async () => {
  let writes = 0;
  await assert.rejects(confirmTransactionEdit("tx-1", patch, {
    expectedOriginal: original,
    readTransactions: async () => [{ ...original, amount: 10 }],
    saveTransactions: async () => { writes++; return true; },
    setTransactions: () => {},
  }), /changed elsewhere/);
  assert.equal(writes, 0);
});
