import test from "node:test";
import assert from "node:assert/strict";
import { confirmImportReversal } from "../src/features/transactions/confirmed-import-reversal.js";
import { prependImportHistory } from "../src/features/transactions/import-history.js";
import { upsertSavedView, withoutSavedView } from "../src/features/transactions/saved-views.js";
import { withTransactionAudit } from "../src/features/transactions/transaction-audit.js";
import { filterTransactionRows } from "../src/features/transactions/discovery-filters.js";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewWorkspace } from "../src/features/transactions/review-workspace.js";
import { summarizeTransactionActivity } from "../src/features/transactions/transaction-activity.js";

const row = (id, extra = {}) => ({ id, importSessionId: "session-a", date: "2026-10-23", merchant: `Merchant ${id}`, amount: 10, type: "expense", category: "Needs review", account: "Checking", tags: [], ...extra });

test("import reversal removes only exact preview rows after a fresh read", async () => {
  const other = row("other", { importSessionId: "session-b" });
  const before = [row("one"), row("two"), other];
  let saved;
  let state;
  const count = await confirmImportReversal("session-a", before.slice(0, 2), {
    readTransactions: async () => before,
    saveTransactions: async next => { saved = next; return true; },
    setTransactions: next => { state = next; },
  });
  assert.equal(count, 2);
  assert.deepEqual(saved, [other]);
  assert.deepEqual(state, [other]);
});

test("import reversal refuses a row changed after its preview", async () => {
  const preview = [row("one")];
  let writes = 0;
  await assert.rejects(confirmImportReversal("session-a", preview, {
    readTransactions: async () => [row("one", { category: "Groceries" })],
    saveTransactions: async () => { writes++; return true; },
    setTransactions: () => {},
  }), /changed since the preview/);
  assert.equal(writes, 0);
});

test("import reversal confirms an uncertain response before reporting success", async () => {
  const preview = [row("one")];
  let reads = 0;
  const count = await confirmImportReversal("session-a", preview, {
    readTransactions: async () => ++reads === 1 ? preview : [],
    saveTransactions: async () => false,
    setTransactions: () => {},
  });
  assert.equal(count, 1);
  assert.equal(reads, 2);
});

test("cloud view updates are bounded and import history retains reconciliation counts", () => {
  let views = [];
  for (let index = 0; index < 7; index++) views = upsertSavedView(views, { name: `View ${index}`, filters: { search: `${index}` } });
  assert.equal(views.length, 5);
  assert.equal(withoutSavedView(views, "View 6").length, 4);
  const history = prependImportHistory([], { id: "session-a", at: "2026-10-23T00:00:00Z", sourceRows: 5, inserted: 2, duplicates: 1, invalid: 1, unconfirmed: 1 });
  assert.deepEqual([history[0].inserted, history[0].duplicates, history[0].invalid, history[0].unconfirmed], [2, 1, 1, 1]);
  let bounded = history;
  for (let index = 0; index < 25; index++) bounded = prependImportHistory(bounded, { id: `session-${index}`, at: "2026-10-23T00:00:00Z" });
  assert.equal(bounded.length, 20);
});

test("audit records only changed fields and discovery preserves combined filters", () => {
  const original = row("one");
  const patch = withTransactionAudit(original, { category: "Groceries", tags: ["Business"] }, "2026-10-23T01:00:00Z", "review workspace");
  assert.deepEqual(patch.changeHistory[0].changes.map(change => change.field), ["category", "tags"]);
  const results = filterTransactionRows([original, row("two", { account: "Card", category: "Groceries" })], { selectedPeriod: "all-time" }, {
    search: "merchant", account: "Checking", category: "all", tag: "all", source: "all", importSession: "session-a", expenseOnly: true, reviewOnly: true, flaggedOnly: false, dateFrom: "", dateTo: "", amountMin: "", amountMax: "", sortBy: "date-desc",
  }, { inPeriod: () => true, flaggedIds: new Set() });
  assert.deepEqual(results.map(item => item.id), ["one"]);
});

test("review queue bounds rendered rows while retaining the full count", () => {
  const rows = Array.from({ length: 1000 }, (_, index) => row(`synthetic-${index}`));
  const html = renderToStaticMarkup(React.createElement(ReviewWorkspace, {
    open: true, transactions: rows, settings: { categories: ["Needs review", "Groceries"], accounts: ["Checking"] }, allTags: [], onSave: async () => {}, onClose: () => {}, formatCurrency: value => String(value), formatDateDisplay: value => value,
  }));
  assert.match(html, /1000 remaining · 0 skipped this visit/);
  assert.equal((html.match(/type="checkbox"/g) || []).length, 60);
});

test("audit summary groups rows from one review batch", () => {
  const entry = { at: "2026-10-23T01:00:00Z", source: "review workspace", batchId: "batch-a", changes: [{ field: "category", from: "Needs review", to: "Groceries" }] };
  const groups = summarizeTransactionActivity([row("one", { changeHistory: [entry] }), row("two", { changeHistory: [entry] })]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].rows.length, 2);
});
