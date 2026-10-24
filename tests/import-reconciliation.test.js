import test from "node:test";
import assert from "node:assert/strict";
import { reconcileImport } from "../src/features/transactions/import-reconciliation.js";

test("statement import counts each source row once", () => {
  assert.deepEqual(reconcileImport({ inserted: 3, duplicates: 2 }, 7, 5), {
    source: 7, submitted: 5, inserted: 3, duplicates: 2, skippedInvalid: 2, unconfirmed: 0, reconciled: true
  });
  assert.equal(reconcileImport({ inserted: 2, duplicates: 1 }, 5, 5).reconciled, false);
});
