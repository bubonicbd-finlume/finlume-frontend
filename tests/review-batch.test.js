import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { applyReviewBatch, mergeReviewBatchResult } from "../src/features/transactions/review-batch.js";

test("partial batch reports confirmed ids and retries unfinished ids only", async () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const calls = [];
  const first = await applyReviewBatch(rows, () => ({ category: "Dining" }), async id => {
    calls.push(id);
    if (id === "b") throw new Error("Cloud write not confirmed");
  });
  deepEqual(first.confirmed, ["a", "c"]);
  deepEqual(first.unfinished.map(item => item.id), ["b"]);
  const retry = await applyReviewBatch(rows.filter(row => first.unfinished.some(item => item.id === row.id)), () => ({ category: "Dining" }), async id => { calls.push(id); });
  deepEqual(retry.confirmed, ["b"]);
  deepEqual(calls, ["a", "b", "c", "b"]);
  equal(retry.unfinished.length, 0);
  deepEqual(mergeReviewBatchResult(first, retry), { confirmed: ["a", "c", "b"], unfinished: [] });
});
