import test from "node:test";
import assert from "node:assert/strict";
import { rememberPendingRecurring, clearPendingRecurring, reconcilePendingRecurring } from "../src/features/split/recurring-recovery.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, value); },
    removeItem(key) { data.delete(key); },
    data,
  };
}

test("a confirmed recurring expense can resume its due-date update after reload", () => {
  const storage = memoryStorage();
  assert.equal(rememberPendingRecurring(storage, "user-1", "group-1", "rule-1", "2026-10-19"), true);
  assert.deepEqual(reconcilePendingRecurring(storage, "user-1", "group-1", [{ id: "rule-1", nextDue: "2026-10-19" }]), { "rule-1": "2026-10-19" });
  assert.deepEqual(reconcilePendingRecurring(storage, "user-2", "group-1", [{ id: "rule-1", nextDue: "2026-10-19" }]), {});
  assert.equal(clearPendingRecurring(storage, "user-1", "group-1", "rule-1"), true);
  assert.deepEqual(reconcilePendingRecurring(storage, "user-1", "group-1", [{ id: "rule-1", nextDue: "2026-10-19" }]), {});
});

test("recovery markers expire when the saved reminder has advanced or changed", () => {
  const storage = memoryStorage();
  rememberPendingRecurring(storage, "user-1", "group-1", "rule-1", "2026-10-19");
  assert.deepEqual(reconcilePendingRecurring(storage, "user-1", "group-1", [{ id: "rule-1", nextDue: "2026-11-19" }]), {});
  assert.equal(storage.data.size, 0);
});

test("unavailable or corrupt browser storage does not break recurring reminders", () => {
  const storage = memoryStorage();
  storage.setItem("finlume_split_pending_recurring_v1:user-1:group-1", "not JSON");
  assert.deepEqual(reconcilePendingRecurring(storage, "user-1", "group-1", [{ id: "rule-1", nextDue: "2026-10-19" }]), {});
  assert.equal(rememberPendingRecurring(null, "user-1", "group-1", "rule-1", "2026-10-19"), false);
  assert.deepEqual(reconcilePendingRecurring(null, "user-1", "group-1", []), {});
});
