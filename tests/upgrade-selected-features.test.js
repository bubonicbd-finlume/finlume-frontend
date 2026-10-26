import test from "node:test";
import assert from "node:assert/strict";
import { buildFinancialPlan } from "../src/features/dashboard/financial-coach.js";
import { inspectDataHealth } from "../src/features/data-health/calculations.js";
import { localizedDate, localizedMoney, safeLocale } from "../src/platform/locale.js";
import { auditCombinedFields, auditExportJson, financialAuditFeed, withRecordCollectionAudit, withSettingsAudit, withTransactionLifecycleAudit } from "../src/platform/settings-audit.js";
import { usableTotpFactors } from "../src/platform/mfa-controls.js";
import { cardWidth, panelWidth, updateCardWidth, updatePanelWidth } from "../src/features/dashboard/card-layout.js";

test("financial plan ranks a real deficit and cash buffer from completed months", () => {
  const transactions = [
    { date: "2026-09-01", type: "income", amount: 1000 },
    { date: "2026-09-02", type: "expense", amount: 1200, category: "Housing" },
    { date: "2026-09-03", type: "expense", amount: 500, category: "Transfer", tags: ["Transfer"] }
  ];
  const plan = buildFinancialPlan(transactions, { netWorthAccounts: [{ type: "asset", category: "Cash & Bank", balance: 100 }] }, "2026-10-26");
  assert.deepEqual(plan.actions.slice(0, 2).map(item => item.id), ["deficit", "emergency"]);
  assert.equal(plan.recent.spending, 1200);
  assert.equal(plan.emergencyTarget, 3600);
});

test("data health finds missing links and stale valuation without altering records", () => {
  const snapshot = { transactions: [], documents: [], settings: { netWorthAccounts: [], investments: [{ name: "Fund", linkedAccountId: "missing", currentValue: 100, lastUpdated: "2026-01-01T00:00:00Z" }] } };
  const original = JSON.stringify(snapshot);
  const findings = inspectDataHealth(snapshot, new Date("2026-10-26T00:00:00Z"));
  assert.ok(findings.some(item => item.key === "broken-investment-links"));
  assert.ok(findings.some(item => item.key === "stale-valuations"));
  assert.equal(JSON.stringify(snapshot), original);
});

test("regional formats change presentation without converting a saved amount", () => {
  assert.equal(localizedDate("2026-10-26", "en-US"), "10/26/2026");
  assert.equal(localizedDate("2026-10-26", "en-GB"), "26/10/2026");
  assert.equal(safeLocale("unknown"), "en-IN");
  assert.match(localizedMoney(1234.5, "INR", "en-US"), /1,234\.5/);
});

test("settings audit retains previous scalar values but excludes vault secrets", () => {
  const next = withSettingsAudit({ locale: "en-IN", vaultConfig: { secret: "old" } }, { locale: "en-US", vaultConfig: { secret: "new" } }, { at: "2026-10-26T00:00:00Z" });
  assert.deepEqual(next.auditHistory[0].changes, [{ field: "locale", from: "en-IN", to: "en-US" }]);
  assert.equal(JSON.stringify(next.auditHistory).includes("secret"), false);
  const feed = financialAuditFeed([{ id: "t", merchant: "Cafe", changeHistory: [{ at: "2026-10-25T00:00:00Z", source: "edit", changes: [{ field: "amount", from: 5, to: 6 }] }] }], next);
  assert.equal(feed.length, 2);
  assert.equal(feed[0].source, "settings save");
  const exported = JSON.parse(auditExportJson(feed, "2026-10-26T12:00:00Z"));
  assert.equal(exported.events.length, 2);
  assert.equal(exported.format, "finlume-audit-v1");
});

test("MFA offers only verified authenticators for sign-in", () => {
  assert.deepEqual(usableTotpFactors([{ id: "pending", status: "unverified" }, { id: "ready", status: "verified" }, { status: "verified" }]).map(item => item.id), ["ready"]);
});

test("combined saves and transaction deletion retain durable audit events", () => {
  const combined = auditCombinedFields({ goals: [] }, { settings: { goals: [{ id: "g1", name: "Goal" }] }, transactions: [] }, "goal payment");
  assert.equal(combined.settings.auditHistory[0].source, "goal payment");
  assert.equal(combined.settings.auditHistory[0].changes[0].field, "goals");
  const deleted = withTransactionLifecycleAudit(combined.settings, [{ id: "t1", merchant: "Shop" }], "delete", "2026-10-26T12:00:00Z");
  assert.deepEqual(deleted.auditHistory[0].changes[0].collection.ids, ["t1"]);
  assert.equal(deleted.auditHistory.length, 2);
});

test("dashboard card widths are bounded to supported columns", () => {
  assert.equal(cardWidth({}, "income"), 1);
  const widths = updateCardWidth({ dashboardCardWidths: { income: 1 } }, "income", 2);
  assert.equal(cardWidth({ dashboardCardWidths: widths }, "income"), 2);
  assert.deepEqual(updateCardWidth({ dashboardCardWidths: widths }, "unknown", 2), widths);
  assert.equal(panelWidth({}, "coach"), 2);
  assert.equal(panelWidth({ dashboardPanelWidths: updatePanelWidth({}, "coach", 1) }, "coach"), 1);
});

test("record collection audit captures edits and removal by ID", () => {
  const before = [{ id: "a", amount: 10, notes: "private note" }, { id: "b", amount: 20 }];
  const after = [{ id: "a", amount: 12, notes: "changed private note" }];
  const result = withRecordCollectionAudit({}, before, after, "transactions", "2026-10-26T12:00:00Z");
  const change = result.auditHistory[0].changes[0];
  assert.deepEqual(change.collection.removedIds, ["b"]);
  assert.deepEqual(change.collection.updated[0].changes, [{ field: "amount", from: 10, to: 12 }]);
  assert.equal(JSON.stringify(result.auditHistory).includes("private note"), false);
});
