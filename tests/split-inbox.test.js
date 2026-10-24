import test from "node:test";
import assert from "node:assert/strict";
import { readSplitInbox } from "../src/features/dashboard/split-inbox.js";

test("Split inbox reads due reminders without recording expenses", async () => {
  const calls = [];
  const client = {
    rpc: async name => { calls.push(name); return { data: [{ id: "g1", name: "Home" }], error: null }; },
    from: table => ({ select: () => ({ eq: async () => { calls.push(table); return { data: [{ id: "r1", description: "Utilities", amount: 50, next_due: "2026-10-21", active: true }], error: null }; } }) })
  };
  const items = await readSplitInbox(client, "2026-10-22");
  assert.equal(items[0].kind, "overdue");
  assert.match(items[0].reason, /separate action/);
  assert.deepEqual(calls, ["krnshare_list_groups", "ks_recurring_expenses"]);
});

test("Split inbox reports failed reads instead of an all-clear", async () => {
  await assert.rejects(readSplitInbox({ rpc: async () => ({ data: null, error: new Error("offline") }) }, "2026-10-22"), /offline/);
});
