import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { readSavedViews, removeView, saveView } from "../src/features/transactions/saved-views.js";

test("views stay account scoped, bounded, and replace a named view", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  let views = [];
  for (let index = 0; index < 6; index++) views = saveView(storage, "account-a", views, { name: `View ${index}`, filters: { tag: "Refund" } });
  equal(views.length, 5);
  views = saveView(storage, "account-a", views, { name: "view 5", filters: { source: "csv" } });
  equal(views.length, 5);
  equal(views[0].filters.source, "csv");
  deepEqual(readSavedViews(storage, "account-b"), []);
  views = removeView(storage, "account-a", views, "view 5");
  equal(views.length, 4);
});
