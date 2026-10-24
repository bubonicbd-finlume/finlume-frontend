import test from "node:test";
import assert from "node:assert/strict";
import { confirmDatePaymentOverride, confirmDatePaymentSteps, datePaymentTransactionCategory, datePaymentTransactionId, undoDatePaymentSteps } from "../src/features/dates/confirmed-payment.js";

const rule = { id: "date-1", overrides: {} };
const patchRules = (rules, id, date, patch) => rules.map(item => item.id === id
  ? { ...item, overrides: { ...item.overrides, [date]: { ...item.overrides?.[date], ...patch } } }
  : item);
const base = { datesToRemember: [rule], theme: "dark" };
const options = overrides => ({ patchRules, ...overrides });

test("linked transaction ID stays stable for an occurrence retry", () => {
  assert.equal(datePaymentTransactionId("rule-1", "2026-10-21"), "date:rule-1:2026-10-21");
  assert.equal(datePaymentTransactionId("rule-1", "2026-10-21"), datePaymentTransactionId("rule-1", "2026-10-21"));
});

test("date payment status changes only after settings save confirms", async () => {
  let visible = base;
  await confirmDatePaymentOverride("date-1", "2026-10-21", { status: "paid", txId: "tx-1" }, options({
    readSettings: async () => base,
    saveSettings: async () => true,
    setSettings: value => { visible = value; },
  }));
  assert.equal(visible.datesToRemember[0].overrides["2026-10-21"].status, "paid");
  assert.equal(visible.theme, "dark");
});

test("lost response and retry do not write the same date twice", async () => {
  let cloud = base;
  let writes = 0;
  const context = options({
    readSettings: async () => cloud,
    saveSettings: async value => { cloud = value; writes++; return false; },
    setSettings: () => {},
  });
  await confirmDatePaymentOverride("date-1", "2026-10-21", { status: "paid" }, context);
  await confirmDatePaymentOverride("date-1", "2026-10-21", { status: "paid" }, context);
  assert.equal(writes, 1);
});

test("rejected date payment keeps the saved state and reports failure", async () => {
  let visible;
  await assert.rejects(confirmDatePaymentOverride("date-1", "2026-10-21", { status: "paid" }, options({
    readSettings: async () => base,
    saveSettings: async () => false,
    setSettings: value => { visible = value; },
  })), /not confirmed/);
  assert.deepEqual(visible, base);
});

test("missing date stops before any write", async () => {
  let writes = 0;
  await assert.rejects(confirmDatePaymentOverride("missing", "2026-10-21", { status: "paid" }, options({
    readSettings: async () => base,
    saveSettings: async () => { writes++; return true; },
    setSettings: () => {},
  })), /changed or was removed/);
  assert.equal(writes, 0);
});

test("payment reports a confirmed transaction when date status fails", async () => {
  const steps = [];
  await assert.rejects(confirmDatePaymentSteps(
    async () => { steps.push("transaction"); },
    async () => { steps.push("date"); throw new Error("Date write failed"); },
  ), /transaction was saved.*retry/i);
  assert.deepEqual(steps, ["transaction", "date"]);
});

test("Undo reports a removed transaction when date status fails", async () => {
  const steps = [];
  await assert.rejects(undoDatePaymentSteps(
    async () => { steps.push("transaction"); },
    async () => { steps.push("date"); throw new Error("Date write failed"); },
  ), /transaction was removed.*retry Undo/i);
  assert.deepEqual(steps, ["transaction", "date"]);
});

test("a failed transaction step does not change the date status", async () => {
  let statusCalls = 0;
  await assert.rejects(confirmDatePaymentSteps(
    async () => { throw new Error("Transaction write failed"); },
    async () => { statusCalls += 1; },
  ), /Transaction write failed/);
  assert.equal(statusCalls, 0);
});

test("a valid date can be paid while malformed sibling records are preserved", async () => {
  let cloud = { datesToRemember: [null, rule] };
  await confirmDatePaymentOverride("date-1", "2026-10-21", { status: "paid" }, {
    readSettings: async () => cloud,
    saveSettings: async next => { cloud = next; return true; },
    setSettings: () => {},
    patchRules: (rules, id, date, patch) => rules.map(item => item?.id === id
      ? { ...item, overrides: { ...item.overrides, [date]: patch } }
      : item),
  });
  assert.equal(cloud.datesToRemember[0], null);
  assert.equal(cloud.datesToRemember[1].overrides["2026-10-21"].status, "paid");
});

test("unsupported date storage stops before a payment write", async () => {
  let writes = 0;
  await assert.rejects(confirmDatePaymentOverride("date-1", "2026-10-21", { status: "paid" }, options({
    readSettings: async () => ({ datesToRemember: { bad: true } }),
    saveSettings: async () => { writes += 1; return true; },
    setSettings: () => {},
  })), /unsupported format/);
  assert.equal(writes, 0);
});

test("date transaction category tolerates malformed saved categories", () => {
  assert.equal(datePaymentTransactionCategory("bills", ["Utilities"]), "Utilities");
  assert.equal(datePaymentTransactionCategory("bills", { Utilities: true }), "Needs review");
});

test("duplicate date IDs stop payment status changes before a write", async () => {
  let writes = 0;
  const duplicate = { ...rule, name: "Other date" };
  await assert.rejects(confirmDatePaymentOverride("date-1", "2026-10-21", { status: "paid" }, options({
    readSettings: async () => ({ datesToRemember: [rule, duplicate] }),
    saveSettings: async () => { writes += 1; return true; },
    setSettings: () => {},
  })), /share this ID/);
  assert.equal(writes, 0);
});
