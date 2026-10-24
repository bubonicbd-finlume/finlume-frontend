import test from "node:test";
import assert from "node:assert/strict";
import { reviewUndoEntries, undoReviewEntries } from "../src/features/transactions/review-undo.js";

test("review undo restores only the last confirmed and unchanged rows", async () => {
  const rows = [{ id: "a", category: "Needs review", subcategory: "", tags: [] }, { id: "b", category: "Needs review", tags: [] }];
  const entries = reviewUndoEntries(rows, ["a"], "category", "Groceries");
  const saved = [];
  const outcome = await undoReviewEntries(entries, [{ ...rows[0], category: "Groceries", subcategory: undefined }, rows[1]], async (id, change) => saved.push({ id, change }));
  assert.equal(outcome.undone, 1);
  assert.deepEqual(saved, [{ id: "a", change: { category: "Needs review", subcategory: "" } }]);
  assert.equal(outcome.remaining.length, 0);
  const changed = await undoReviewEntries(entries, [{ ...rows[0], category: "Education" }], async () => assert.fail("must not overwrite a later edit"));
  assert.equal(changed.remaining.length, 1);
});
