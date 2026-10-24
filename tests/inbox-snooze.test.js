import test from "node:test";
import assert from "node:assert/strict";
import { isInboxSnoozed, readInboxSnoozes, snoozeInboxItem } from "../src/features/dashboard/inbox-snooze.js";

test("Inbox snooze is account-scoped, expires and returns when the item changes", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const item = { key: "budget:Dining", title: "Dining budget warning", reason: "At 80%", kind: "recorded", amount: 80 };
  const now = Date.parse("2026-10-23T00:00:00Z");
  const saved = snoozeInboxItem(storage, "user-one", [], item, now);
  assert.ok(saved);
  assert.equal(isInboxSnoozed(readInboxSnoozes(storage, "user-one", now), item, now), true);
  assert.equal(isInboxSnoozed(readInboxSnoozes(storage, "user-two", now), item, now), false);
  assert.equal(isInboxSnoozed(saved, { ...item, amount: 90 }, now), false);
  assert.equal(readInboxSnoozes(storage, "user-one", now + 86400000).length, 0);
});

test("Inbox snooze refuses to hide an item if local storage fails", () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error("Storage blocked"); } };
  assert.equal(snoozeInboxItem(storage, "one", [], { key: "a", title: "A", reason: "R", kind: "recorded" }), null);
});
