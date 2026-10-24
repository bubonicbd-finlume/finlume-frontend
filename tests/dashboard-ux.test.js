import test from "node:test";
import assert from "node:assert/strict";
import { groupInboxItems } from "../src/features/dashboard/inbox-groups.js";
import { buildSetupSteps, setupGuideStorageKey } from "../src/features/dashboard/setup-guide.js";
import { financeLastSaveKey, reduceFinanceSyncStatus } from "../src/platform/finance-sync-status.js";

test("inbox keeps overdue, upcoming and data review separate without losing items", () => {
  const items = [
    { key: "date:late", kind: "overdue" },
    { key: "date:future", kind: "scheduled" },
    { key: "categorization", kind: "recorded" },
    { key: "import:session", kind: "unconfirmed" },
    { key: "budget:Food", kind: "recorded" }
  ];
  const groups = groupInboxItems(items);
  assert.deepEqual(groups.map(group => group.items.map(item => item.key)), [
    ["date:late", "budget:Food"], ["date:future"], ["categorization", "import:session"]
  ]);
});

test("first-use checklist reflects saved records and scopes dismissal by account", () => {
  assert.deepEqual(buildSetupSteps([], {}).map(step => step.done), [false, false, false]);
  assert.deepEqual(buildSetupSteps([{ id: "1" }], { budgets: [{ category: "Food" }], datesToRemember: [] }).map(step => step.done), [true, true, false]);
  assert.notEqual(setupGuideStorageKey("alice"), setupGuideStorageKey("bob"));
});

test("Finance save status waits for concurrent writes and retains failures", () => {
  let status = { status: "idle", pending: 0, at: null, message: "" };
  status = reduceFinanceSyncStatus(status, { status: "saving" });
  status = reduceFinanceSyncStatus(status, { status: "saving" });
  status = reduceFinanceSyncStatus(status, { status: "saved", at: "2026-10-23T10:00:00Z" });
  assert.equal(status.status, "saving");
  status = reduceFinanceSyncStatus(status, { status: "error", message: "Conflict" });
  assert.equal(status.status, "error");
  assert.equal(status.message, "Conflict");
  status = reduceFinanceSyncStatus(status, { status: "saved", at: "2026-10-23T10:01:00Z" });
  assert.equal(status.status, "error");
  assert.notEqual(financeLastSaveKey("alice"), financeLastSaveKey("bob"));
});
