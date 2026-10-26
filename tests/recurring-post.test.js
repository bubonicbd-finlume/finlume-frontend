import test from "node:test";
import assert from "node:assert/strict";
import { confirmRecurringPost, confirmRecurringSkip, prepareRecurringPostRow, prepareRecurringSkipRow } from "../src/features/recurring/confirmed-post.js";

const row = () => ({ updated_at: "v1", transactions: [], settings: { accounts: ["Checking"], recurring: [{ id: "rent", name: "Rent", amount: 100, type: "expense", category: "Housing", account: "Checking", cadence: "monthly", nextDate: "2026-10-25", active: true }], subscriptions: [] } });
const prepareTransaction = (entry, transactions) => [entry, ...transactions];
const options = { kind: "recurring", scheduleId: "rent", occurrence: "2026-10-25", prepareTransaction };

test("recurring posting advances schedule and creates one transaction", () => {
  const next = prepareRecurringPostRow(row(), options);
  assert.equal(next.transactions.length, 1);
  assert.equal(next.transactions[0].id, "recurring:recurring:rent:2026-10-25");
  assert.equal(next.settings.recurring[0].nextDate, "2026-11-25");
  assert.equal(next.settings.recurring[0].lastPostedTransactionId, next.transactions[0].id);
});

test("recurring posting links a matching saved transaction instead of duplicating it", () => {
  const before = row();
  before.transactions = [{ id: "imported", date: "2026-10-25", merchant: "Rent", amount: 100, type: "expense", account: "Checking" }];
  const next = prepareRecurringPostRow(before, options);
  assert.equal(next.transactions.length, 1);
  assert.equal(next.settings.recurring[0].lastPostedTransactionId, "imported");
  assert.deepEqual(prepareRecurringPostRow({ ...before, ...next }, options), next);
});

test("recurring posting confirms a committed write after a lost response", async () => {
  let cloud = row();
  let confirmed;
  await confirmRecurringPost({ ...options, readRow: async () => cloud, writeRow: async next => { cloud = { ...cloud, ...next, updated_at: "v2" }; throw new Error("response lost"); }, onConfirmed: value => { confirmed = value; } });
  assert.equal(confirmed.settings.recurring[0].nextDate, "2026-11-25");
  assert.equal(confirmed.transactions.length, 1);
});

test("recurring posting rejects a stale or inactive occurrence", () => {
  const before = row();
  before.settings.recurring[0].active = false;
  assert.throws(() => prepareRecurringPostRow(before, options), /no longer due/);
});

test("recurring posting completes a schedule after its end date", () => {
  const before = row();
  before.settings.recurring[0].endDate = "2026-10-31";
  const next = prepareRecurringPostRow(before, options);
  assert.equal(next.settings.recurring[0].nextDate, "2026-11-25");
  assert.equal(next.settings.recurring[0].active, false);
  assert.equal(next.settings.recurring[0].status, "completed");
});

test("recurring posting rejects occurrences outside saved boundaries", () => {
  const before = row();
  before.settings.recurring[0].startDate = "2026-10-26";
  assert.throws(() => prepareRecurringPostRow(before, options), /no longer due/);
});

test("recurring posting never claims success when a write failed", async () => {
  const cloud = row();
  let confirmed = false;
  await assert.rejects(confirmRecurringPost({ ...options, readRow: async () => cloud, writeRow: async () => { throw new Error("offline"); }, onConfirmed: () => { confirmed = true; } }), /not confirmed/);
  assert.equal(confirmed, false);
  assert.equal(cloud.transactions.length, 0);
});

test("skipping an occurrence advances it without creating a transaction", () => {
  const next = prepareRecurringSkipRow(row(), options);
  assert.equal(next.transactions.length, 0);
  assert.equal(next.settings.recurring[0].nextDate, "2026-11-25");
  assert.deepEqual(next.settings.recurring[0].skippedOccurrences, ["2026-10-25"]);
});

test("skip confirmation accepts a committed write after a lost response", async () => {
  let cloud = row(), confirmed;
  await confirmRecurringSkip({ ...options, readRow: async () => cloud, writeRow: async next => { cloud = { ...cloud, ...next, updated_at: "v2" }; throw new Error("lost"); }, onConfirmed: value => { confirmed = value; } });
  assert.deepEqual(confirmed.settings.recurring[0].skippedOccurrences, ["2026-10-25"]);
  assert.equal(confirmed.transactions.length, 0);
});
