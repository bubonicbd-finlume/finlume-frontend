import test from "node:test";
import assert from "node:assert/strict";
import { expiredDateCleanup, prepareDateRules } from "../src/features/dates/safe-rules.js";

const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

test("date records used by the page and shell skip malformed siblings", () => {
  const good = { id: "rent", name: "Rent", dueDate: "2026-10-21" };
  const source = [null, { name: 42, dueDate: "2026-10-21" }, good, { name: "Bad date", dueDate: "tomorrow" }];
  const result = prepareDateRules(source, validDate);
  assert.deepEqual(result.rules, [good]);
  assert.equal(result.invalidCount, 3);
  assert.equal(source.length, 4);
});

test("unsupported saved-date container yields a safe empty view", () => {
  assert.deepEqual(prepareDateRules({ rent: true }, validDate), { rules: [], invalidCount: 1 });
});

test("date records with missing or duplicate IDs stay stored but are not actionable", () => {
  const dueDate = "2026-10-21";
  const source = [
    { name: "No ID", dueDate },
    { id: "shared", name: "First", dueDate },
    { id: "shared", name: "Second", dueDate },
    { id: "unique", name: "Safe", dueDate },
  ];
  const result = prepareDateRules(source, validDate);
  assert.deepEqual(result.rules, [source[3]]);
  assert.equal(result.invalidCount, 3);
  assert.equal(source.length, 4);
});

test("a malformed sibling with the same ID also hides the conflicting date", () => {
  const source = [
    { id: "shared", name: "Safe looking", dueDate: "2026-10-21" },
    { id: "shared", name: 42, dueDate: "2026-10-21" },
  ];
  assert.deepEqual(prepareDateRules(source, validDate), { rules: [], invalidCount: 2 });
});

test("unsupported recurrence and invalid end dates are reported instead of disappearing silently", () => {
  const source = [
    { id: "unknown", name: "Unknown", dueDate: "2026-10-21", recurrence: "weekly" },
    { id: "bad-end", name: "Bad end", dueDate: "2026-10-21", recurrence: "monthly", endDate: "tomorrow" },
    { id: "early-end", name: "Early end", dueDate: "2026-10-21", recurrence: "monthly", endDate: "2026-10-20" },
    { id: "monthly", name: "Valid", dueDate: "2026-10-21", recurrence: "monthly", endDate: "2026-12-21" },
  ];
  assert.deepEqual(prepareDateRules(source, validDate), { rules: [source[3]], invalidCount: 3 });
});

test("date rows with non-text display fields stay stored but cannot crash rendering", () => {
  const source = [
    { id: "bad-account", name: "Rent", dueDate: "2026-10-21", account: { name: "Checking" } },
    { id: "bad-category", name: "Tax", dueDate: "2026-10-21", category: ["bills"] },
    { id: "good", name: "Insurance", dueDate: "2026-10-21", account: "Checking", category: "bills" },
  ];
  assert.deepEqual(prepareDateRules(source, validDate), { rules: [source[2]], invalidCount: 2 });
});

test("expired date cleanup preserves malformed and recent deleted siblings", () => {
  const source = [
    null,
    { id: "old", deletedAt: "2026-09-01T00:00:00Z" },
    { id: "recent", deletedAt: "2026-10-10T00:00:00Z" },
    { id: "bad", deletedAt: "unknown" },
  ];
  const daysBetween = (start, end) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
  assert.deepEqual(expiredDateCleanup(source, "2026-10-22", validDate, daysBetween, 30), [source[0], source[2], source[3]]);
  assert.equal(source.length, 4);
});

test("expired date cleanup does not request a write when nothing is due", () => {
  assert.equal(expiredDateCleanup([{ id: "active" }], "2026-10-22", validDate, () => 0, 30), null);
  assert.equal(expiredDateCleanup({ invalid: true }, "2026-10-22", validDate, () => 0, 30), null);
});
