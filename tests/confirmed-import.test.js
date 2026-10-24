import test from "node:test";
import assert from "node:assert/strict";
import { confirmStatementImport } from "../src/features/transactions/confirmed-import.js";

const rows = [{ id: "new-row" }];
const prepare = (_rows, before) => ({
  next: [...rows, ...before], result: { inserted: 1, duplicates: 0 }, ids: ["new-row"],
});

test("statement import reports success only after a confirmed save", async () => {
  let shown;
  const result = await confirmStatementImport(rows, {
    readTransactions: async () => [], prepare,
    saveTransactions: async next => { assert.equal(shown, undefined); assert.deepEqual(next, rows); return true; },
    setTransactions: value => { shown = value; },
  });
  assert.equal(result.inserted, 1);
  assert.deepEqual(shown, rows);
});

test("statement import recovers a cloud commit whose response was lost", async () => {
  let reads = 0;
  const result = await confirmStatementImport(rows, {
    readTransactions: async () => ++reads === 1 ? [] : rows,
    prepare, saveTransactions: async () => false, setTransactions: () => {},
  });
  assert.equal(reads, 2);
  assert.equal(result.inserted, 1);
});

test("failed import refreshes account data and keeps retry available", async () => {
  let reads = 0;
  let shown;
  await assert.rejects(confirmStatementImport(rows, {
    readTransactions: async () => { reads++; return []; },
    prepare, saveTransactions: async () => false,
    setTransactions: value => { shown = value; },
  }), /not fully confirmed/);
  assert.equal(reads, 2);
  assert.deepEqual(shown, []);
});

test("uncertain import result never claims success", async () => {
  let reads = 0;
  await assert.rejects(confirmStatementImport(rows, {
    readTransactions: async () => { if (++reads === 2) throw new Error("offline"); return []; },
    prepare, saveTransactions: async () => false, setTransactions: () => {},
  }), /could not be confirmed/);
});
