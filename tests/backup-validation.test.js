import test from "node:test";
import assert from "node:assert/strict";
import { inspectBackupDocuments, canReplaceBackup } from "../src/features/settings/backup-validation.js";

const doc = { id: "d1", filename: "receipt.pdf", createdAt: "2026-10-20T00:00:00Z", size: 12, dataUrl: null };

test("backup preview identifies malformed and duplicate document records", () => {
  const result = inspectBackupDocuments([doc, { ...doc }, { id: "bad", filename: "x", createdAt: null, size: 3 }]);
  assert.deepEqual(result.valid, [doc]);
  assert.equal(result.invalidCount, 2);
});

test("backup preview accepts encrypted vault documents", () => {
  const result = inspectBackupDocuments([{ ...doc, encrypted: { iv: "a", ct: "b" } }]);
  assert.equal(result.invalidCount, 0);
});

test("replace refuses incomplete records while merge remains available", () => {
  assert.equal(canReplaceBackup({ invalidTransactions: 1, invalidDocuments: 0, withDocuments: false }), false);
  assert.equal(canReplaceBackup({ invalidTransactions: 0, invalidDocuments: 1, withDocuments: true }), false);
  assert.equal(canReplaceBackup({ invalidTransactions: 0, invalidDocuments: 1, withDocuments: false }), true);
});
