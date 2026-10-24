import test from "node:test";
import assert from "node:assert/strict";
import { inspectDataHealth } from "../src/features/data-health/calculations.js";

test("data health previews duplicates and malformed siblings without changing records", () => {
  const snapshot = { transactions: [{ id: "one", date: "2026-10-01", merchant: "Cafe", amount: 10, type: "expense" }, { id: "two", date: "2026-10-01", merchant: "Cafe", amount: 10, type: "expense" }, null], documents: [{ id: "d", name: "Bill" }], settings: { rules: [{ id: "good" }, null], lastBackupAt: "2026-10-21T00:00:00Z" } };
  const before = JSON.stringify(snapshot);
  const findings = inspectDataHealth(snapshot, new Date("2026-10-22T00:00:00Z"));
  assert.ok(findings.some(item => item.title.includes("possible duplicate")));
  assert.ok(findings.some(item => item.key === "transaction:2"));
  assert.ok(findings.some(item => item.key === "setting:rules:1"));
  const duplicate = findings.find(item => item.key === "duplicate:0");
  assert.match(duplicate.preview.affected, /ID one/);
  assert.match(duplicate.preview.affected, /ID two/);
  assert.match(duplicate.preview.preserved, /remains saved/);
  assert.deepEqual(duplicate.targets, [{ id: "one", label: "Entry 1" }, { id: "two", label: "Entry 2" }]);
  assert.equal(JSON.stringify(snapshot), before);
});

test("data health does not treat malformed cloud collections as clear", () => {
  const findings = inspectDataHealth({ transactions: {}, documents: null, settings: {} });
  assert.ok(findings.some(item => item.key === "transactions-format"));
  assert.ok(findings.some(item => item.key === "documents-format"));
});
