import test from "node:test";
import assert from "node:assert/strict";
import { confirmAtomicDatePayment, prepareDatePaymentRow } from "../src/features/dates/atomic-payment.js";

const base = () => ({
  transactions: [],
  settings: { datesToRemember: [{ id: "bill", name: "Bill", overrides: {} }], theme: "dark" },
  updated_at: "2026-10-23T00:00:00Z"
});
const patchRules = (rules, id, date, patch) => rules.map(rule => rule.id === id ? { ...rule, overrides: { ...rule.overrides, [date]: patch } } : rule);
const options = {
  ruleId: "bill", origDate: "2026-10-23", patch: { status: "paid", txId: "date:bill:2026-10-23" },
  transaction: { id: "date:bill:2026-10-23", date: "2026-10-23", amount: 100, type: "expense" },
  patchRules,
  prepareTransaction: (entry, rows) => [entry, ...rows]
};

test("linked payment writes both fields in one call and updates local state after confirmation", async () => {
  const row = base();
  const calls = [];
  let confirmed;
  await confirmAtomicDatePayment({ ...options, readRow: async () => row,
    writeRow: async (next, version) => { calls.push({ next, version }); },
    onConfirmed: value => { confirmed = value; } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].version, row.updated_at);
  assert.equal(calls[0].next.transactions.length, 1);
  assert.equal(calls[0].next.settings.datesToRemember[0].overrides["2026-10-23"].status, "paid");
  assert.equal(confirmed.transactions.length, 1);
});

test("conflicting linked transaction aborts before writing", () => {
  const row = base();
  row.transactions = [{ id: options.transaction.id, date: "2026-10-22", amount: 100, type: "expense" }];
  assert.throws(() => prepareDatePaymentRow(row, options), /different details/);
});

test("linked transaction preparation receives the freshly read settings", () => {
  const row = base();
  let received;
  prepareDatePaymentRow(row, { ...options, prepareTransaction: (entry, transactions, settings) => {
    received = settings;
    return [entry, ...transactions];
  } });
  assert.equal(received, row.settings);
});

test("uncertain response is accepted only if both fields were saved", async () => {
  let row = base();
  let confirmed = 0;
  await confirmAtomicDatePayment({ ...options, readRow: async () => row,
    writeRow: async next => { row = { ...row, ...next }; throw new Error("lost response"); },
    onConfirmed: () => { confirmed++; } });
  assert.equal(confirmed, 1);
  row = base();
  await assert.rejects(confirmAtomicDatePayment({ ...options, readRow: async () => row,
    writeRow: async () => { row = { ...row, transactions: [options.transaction] }; throw new Error("lost response"); },
    onConfirmed: () => { confirmed++; } }), /not confirmed/);
  assert.equal(confirmed, 1);
});
