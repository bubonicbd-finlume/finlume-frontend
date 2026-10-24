import test from "node:test";
import assert from "node:assert/strict";
import { computeGlobalSearchResults } from "../src/platform/global-search.js";

test("search keeps valid matches and skips incomplete saved rows", () => {
  const valid = { id: "t1", merchant: "Coffee", category: "Food", date: "2026-10-22", amount: 120, tags: ["daily"] };
  const result = computeGlobalSearchResults("cof", {
    transactions: [null, { merchant: "Coffee" }, { ...valid, id: "t2", tags: [null] }, valid],
    documents: [null, { id: "d1", filename: "Coffee receipt.pdf" }],
    investments: [null, { id: "i1", name: "Coffee Fund", currentValue: 100 }],
  });
  assert.deepEqual(result.transactions.map(row => row.id), ["t1", "t2"]);
  assert.deepEqual(result.documents.map(row => row.id), ["d1"]);
  assert.deepEqual(result.investments.map(row => row.id), ["i1"]);
});

test("search tolerates malformed collections and fields without mutating sources", () => {
  const rows = [{ id: "a", merchant: "Store", category: "Food", date: "2026-01-01", amount: 5, tags: "bad" },
    { id: "b", merchant: "Store", category: "Food", date: "2026-02-01", amount: 5, tags: [null, "food"] }];
  const result = computeGlobalSearchResults("food", { transactions: rows, documents: {}, investments: "bad" });
  assert.deepEqual(result.transactions.map(row => row.id), ["b", "a"]);
  assert.equal(rows[0].id, "a");
  assert.deepEqual(computeGlobalSearchResults(null, { transactions: rows }), { transactions: [], documents: [], investments: [] });
});
