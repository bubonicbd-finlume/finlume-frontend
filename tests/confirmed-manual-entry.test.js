import test from "node:test";
import assert from "node:assert/strict";
import { confirmManualEntry } from "../src/features/transactions/confirmed-manual-entry.js";

const entry = { id: "manual-1", date: "2026-10-21", amount: 10, merchant: "Test" };
const prepare = (raw, before) => ({ next: [{ ...raw, createdAt: "now" }, ...before], ids: [raw.id] });

test("manual entry waits for a confirmed cloud save", async () => {
  let shown;
  await confirmManualEntry(entry, { readTransactions: async () => [], prepare, saveTransactions: async () => { assert.equal(shown, undefined); return true; }, setTransactions: value => { shown = value; } });
  assert.equal(shown[0].id, entry.id);
});

test("manual entry retry recognizes a matching saved ID", async () => {
  let writes = 0;
  await confirmManualEntry(entry, { readTransactions: async () => [{ ...entry, createdAt: "earlier" }], prepare, saveTransactions: async () => { writes++; return true; }, setTransactions: () => {} });
  assert.equal(writes, 0);
});

test("manual entry refuses a saved ID with different details", async () => {
  await assert.rejects(confirmManualEntry(entry, { readTransactions: async () => [{ ...entry, amount: 99 }], prepare, saveTransactions: async () => true, setTransactions: () => {} }), /Review Transactions/);
});

test("manual entry rereads after a lost write response", async () => {
  let reads = 0;
  await confirmManualEntry(entry, { readTransactions: async () => ++reads === 1 ? [] : [{ ...entry, createdAt: "now" }], prepare, saveTransactions: async () => false, setTransactions: () => {} });
  assert.equal(reads, 2);
});
