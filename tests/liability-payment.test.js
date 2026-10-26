import test from "node:test";
import assert from "node:assert/strict";
import { confirmLiabilityPayment, prepareLiabilityPaymentRow } from "../src/features/liabilities/confirmed-payment.js";

const row = () => ({ updated_at: "v1", transactions: [], settings: { netWorthAccounts: [{ id: "loan", type: "liability", name: "Car loan", balance: 1000 }] } });
const prepareTransactions = (entries, transactions) => [...entries, ...transactions];
const options = { liabilityId: "loan", paymentId: "liability-payment:test", date: "2026-10-25", account: "Checking", principal: 200, interest: 20, fees: 5, prepareTransactions };

test("liability payment splits accounting and reduces principal once", () => {
  const next = prepareLiabilityPaymentRow(row(), options);
  assert.equal(next.settings.netWorthAccounts[0].balance, 800);
  assert.equal(next.settings.netWorthAccounts[0].paymentHistory[0].total, 225);
  assert.deepEqual(next.transactions.map(item => [item.category, item.amount]), [["Transfer - Own Accounts", 200], ["EMI", 20], ["Bank Charges", 5]]);
  assert.deepEqual(prepareLiabilityPaymentRow({ ...row(), ...next }, options), next);
});
test("liability payment validates principal against the current balance", () => {
  assert.throws(() => prepareLiabilityPaymentRow(row(), { ...options, principal: 1001 }), /cannot exceed/);
  assert.throws(() => prepareLiabilityPaymentRow(row(), { ...options, principal: 0 }), /greater than zero/);
});
test("liability payment confirms a committed write after a lost response", async () => {
  let cloud = row(), confirmed;
  await confirmLiabilityPayment({ ...options, readRow: async () => cloud, writeRow: async next => { cloud = { ...cloud, ...next, updated_at: "v2" }; throw new Error("lost"); }, onConfirmed: value => { confirmed = value; } });
  assert.equal(confirmed.settings.netWorthAccounts[0].balance, 800);
  assert.equal(confirmed.transactions.length, 3);
});
test("liability payment does not claim a failed write succeeded", async () => {
  const cloud = row();
  await assert.rejects(confirmLiabilityPayment({ ...options, readRow: async () => cloud, writeRow: async () => { throw new Error("offline"); }, onConfirmed: () => {} }), /not confirmed/);
  assert.equal(cloud.transactions.length, 0);
});
