import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSplitRecurring } from "../src/features/split/recurring.js";

const icon = () => null;
const box = ({ children }) => React.createElement("div", null, children);
const saved = {
  id: "rule-1", description: "Rent", category: "Rent", amount: 1200,
  payer_id: "me", frequency: "monthly", member_ids: ["me", "friend"],
  next_due: "2026-11-01", active: true, created_at: "2026-10-19",
};

function makeDeps(supabaseClient = {}) {
  return new Proxy({
    Button: ({ children }) => React.createElement("button", null, children),
    Card: box,
    Field: ({ label, children }) => React.createElement("label", null, label, children),
    HowItWorksButton: icon,
    KS_CATEGORIES: [{ value: "Rent", emoji: "🏠" }],
    Modal: ({ open, title, children, footer }) => open
      ? React.createElement("section", null, React.createElement("h2", null, title), children, footer)
      : null,
    addMonthsToYMD: () => "2026-11-01",
    inputCls: "", selectCls: "",
    ksErrorText: error => String(error),
    ksMoney: value => `₹${Number(value).toFixed(2)}`,
    ksPersonLabel: member => member.display_name,
    parseYMD: value => new Date(`${value}T00:00:00`),
    supabaseClient,
    todayYMD: () => "2026-10-19",
  }, {
    get(target, key) { return key in target ? target[key] : icon; },
  });
}

test("Split recurring card and editor retain reminder-first entry screens", () => {
  const { KsRecurringCard, KsRecurringModal, KsRecurringRow } = createSplitRecurring(makeDeps());
  const card = renderToString(React.createElement(KsRecurringCard, {
    group: { id: "isolated-group" },
    session: { user: { id: "me" } },
    members: [{ user_id: "me", display_name: "Me" }],
    onToast() {}, onChanged() {},
  }));
  assert.match(card, /Recurring expenses/);
  assert.match(card, /remind you to log it/);

  const editor = renderToString(React.createElement(KsRecurringModal, {
    open: true, onClose() {}, onSaved() {},
    group: { id: "isolated-group" },
    session: { user: { id: "me" } },
    members: [{ user_id: "me", display_name: "Me" }],
    template: null,
  }));
  assert.match(editor, /New recurring expense/);
  assert.match(editor, /First due/);
  assert.match(editor, /Split equally between/);

  const due = renderToString(React.createElement(KsRecurringRow, {
    template: {
      id: "rule-1", description: "Rent", category: "Rent", amount: 1200,
      frequency: "monthly", memberIds: ["me"], active: true, nextDue: "2026-10-01",
    },
    members: [], onLogNow() {}, onTogglePause() {}, onEdit() {}, onDelete() {}, logging: false,
  }));
  assert.match(due, /due now/);
  assert.match(due, /Log it/);
  const pending = renderToString(React.createElement(KsRecurringRow, {
    template: { id: "rule-1", description: "Rent", category: "Rent", amount: 1200, frequency: "monthly", memberIds: ["me"], active: true, nextDue: "2026-10-01" },
    members: [], onLogNow() {}, onTogglePause() {}, onEdit() {}, onDelete() {}, logging: false, pendingAdvance: true,
  }));
  assert.match(pending, /Advance reminder/);
  assert.doesNotMatch(pending, /Log it/);
});

test("Split recurring dates advance weekly and monthly as before", () => {
  const { ksNextDue } = createSplitRecurring(makeDeps());
  assert.equal(ksNextDue("weekly", "2026-10-19"), "2026-10-26");
  assert.equal(ksNextDue("monthly", "2026-10-01"), "2026-11-01");
});

test("Split recurring service keeps table and stored field mapping", async () => {
  const calls = [];
  const query = {
    select(value) { calls.push(["select", value]); return this; },
    eq(field, value) { calls.push(["eq", field, value]); return this; },
    order(field) { calls.push(["order", field]); return Promise.resolve({ data: [saved], error: null }); },
    insert(rows) { calls.push(["insert", rows]); return this; },
    single() { calls.push(["single"]); return Promise.resolve({ data: saved, error: null }); },
    update(row) { calls.push(["update", row]); return this; },
    delete() { calls.push(["delete"]); return this; },
    then(resolve) { resolve({ error: null }); },
  };
  const supabaseClient = { from(table) { calls.push(["from", table]); return query; } };
  const service = createSplitRecurring(makeDeps(supabaseClient));
  const listed = await service.ksListRecurring("isolated-group");
  assert.equal(listed[0].payerId, "me");
  assert.deepEqual(listed[0].memberIds, ["me", "friend"]);

  const row = {
    description: "Rent", category: "Rent", amount: 1200,
    payerId: "me", frequency: "monthly", memberIds: ["me", "friend"],
    nextDue: "2026-11-01", active: true,
  };
  const added = await service.ksAddRecurring("isolated-group", row, "me");
  assert.equal(added.id, "rule-1");
  assert.deepEqual(calls.find(call => call[0] === "insert")[1][0], {
    group_id: "isolated-group", description: "Rent", category: "Rent", amount: 1200,
    payer_id: "me", frequency: "monthly", member_ids: ["me", "friend"],
    next_due: "2026-11-01", active: true, created_by: "me",
  });
  await service.ksEditRecurring("isolated-group", "rule-1", row);
  await service.ksSetRecurringActive("isolated-group", "rule-1", false);
  await service.ksSetRecurringNextDue("isolated-group", "rule-1", "2026-12-01");
  await service.ksDeleteRecurring("isolated-group", "rule-1");
  assert.ok(calls.filter(call => call[0] === "from").every(call => call[1] === "ks_recurring_expenses"));
  assert.ok(calls.some(call => call[0] === "update" && call[1].next_due === "2026-12-01"));
  assert.ok(calls.some(call => call[0] === "delete"));
});

test("Split recurring reads distinguish an empty list from a failed request", async () => {
  let result = { data: [], error: null };
  const query = {
    select() { return this; },
    eq() { return this; },
    order() { return Promise.resolve(result); },
  };
  const { ksListRecurring } = createSplitRecurring(makeDeps({ from: () => query }));
  assert.deepEqual(await ksListRecurring("isolated-group"), []);
  result = { data: [saved], error: null };
  assert.equal((await ksListRecurring("isolated-group"))[0].id, "rule-1");
  result = { data: null, error: new Error("recurring unavailable") };
  await assert.rejects(ksListRecurring("isolated-group"), /recurring unavailable/);
});

test("Split recurring pause and remove writes report cloud failures", async () => {
  const query = {
    update() { return this; },
    delete() { return this; },
    eq() { return this; },
    then(resolve, reject) { return Promise.resolve({ error: new Error("write denied") }).then(resolve, reject); },
  };
  const { ksSetRecurringActive, ksSetRecurringNextDue, ksDeleteRecurring } = createSplitRecurring(makeDeps({ from: () => query }));
  await assert.rejects(ksSetRecurringActive("isolated-group", "rule-1", false), /write denied/);
  await assert.rejects(ksSetRecurringNextDue("isolated-group", "rule-1", "2026-11-01"), /write denied/);
  await assert.rejects(ksDeleteRecurring("isolated-group", "rule-1"), /write denied/);
});
