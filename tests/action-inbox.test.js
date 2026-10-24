import test from "node:test";
import assert from "node:assert/strict";
import { buildActionInbox } from "../src/features/dashboard/action-inbox.js";

test("action inbox separates recorded warnings from projected schedules", () => {
  const items = buildActionInbox({
    today: "2026-10-22",
    transactions: [{ id: "t1", date: "2026-10-20", type: "expense", amount: 90, category: "Needs review" }],
    settings: { recurring: [{ id: "r1", name: "Rent", amount: 500, nextDate: "2026-11-01" }], budgets: [{ category: "Needs review", limit: 100 }] },
    dateInstances: [{ key: "d1", name: "Insurance", dueDate: "2026-10-21", amount: 40, paid: false }]
  });
  assert.deepEqual(items.map(item => item.kind), ["overdue", "scheduled", "recorded", "recorded"]);
  assert.equal(items.find(item => item.title === "Rent").tab, "recurring");
  assert.match(items.find(item => item.title === "Rent").reason, /no transaction has been recorded/);
});
