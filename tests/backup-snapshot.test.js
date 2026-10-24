import test from "node:test";
import assert from "node:assert/strict";
import { readConfirmedBackupSnapshot } from "../src/features/settings/backup-snapshot.js";

test("backup snapshot uses the freshly read cloud row", async () => {
  const row = {
    transactions: [{ id: "latest-transaction" }],
    documents: [{ id: "latest-document" }],
    settings: { currency: "INR" },
  };
  let reads = 0;
  const snapshot = await readConfirmedBackupSnapshot(async () => {
    reads += 1;
    return row;
  });
  assert.equal(reads, 1);
  assert.deepEqual(snapshot, row);
});

test("backup snapshot refuses a missing or malformed cloud row", async () => {
  await assert.rejects(readConfirmedBackupSnapshot(async () => null), /No file was downloaded/);
  await assert.rejects(readConfirmedBackupSnapshot(async () => ({ transactions: [], settings: {} })), /incomplete/);
  await assert.rejects(readConfirmedBackupSnapshot(async () => ({ transactions: {}, documents: [], settings: {} })), /unexpected format/);
  await assert.rejects(readConfirmedBackupSnapshot(async () => ({ transactions: [], documents: [], settings: [] })), /unexpected format/);
});

test("backup snapshot propagates a cloud read failure", async () => {
  await assert.rejects(readConfirmedBackupSnapshot(async () => {
    throw new Error("Connection lost");
  }), /Connection lost/);
});
