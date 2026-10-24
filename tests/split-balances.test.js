import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSplitBalances } from "../src/features/split/balances.js";

const icon = () => null;
const box = ({ children }) => React.createElement("div", null, children);
const deps = new Proxy({
  Button: ({ children }) => React.createElement("button", null, children),
  Card: box,
  Field: ({ label, children }) => React.createElement("label", null, label, children),
  Modal: ({ open, title, children, footer }) => open
    ? React.createElement("section", null, React.createElement("h2", null, title), children, footer)
    : null,
  KsErrorNote: icon,
  Skeleton: box,
  ksComputeDirectDebts: () => [],
  ksComputeGuestSettlement: () => ({ transfers: [], net: new Map() }),
  ksFromPaise: value => value / 100,
  ksIsGuestId: id => id.startsWith("guest:"),
  ksMoney: value => `₹${Number(value).toFixed(2)}`,
  ksToPaise: value => Math.round(Number(value) * 100) || 0,
  inputCls: "",
}, {
  get(target, key) { return key in target ? target[key] : icon; },
});

test("Split balance card keeps its isolated loading state", () => {
  const { KsBalancesCard } = createSplitBalances(deps);
  const html = renderToString(React.createElement(KsBalancesCard, {
    group: { id: "isolated-group", name: "Test group" },
    session: { user: { id: "isolated-user" } },
    refreshKey: 0, onToast() {}, onChanged() {},
    members: [], guests: [], isCreator: false,
  }));
  assert.match(html, /Balance/);
  assert.match(html, /space-y-3/);
});

test("Split balance data rejects partial reads instead of showing zero debt", async () => {
  const values = {
    ksComputeBalances: { people: [{ user_id: "me", net: 20 }], simplified: [] },
    ksListSettlements: [{ id: "settlement-1" }],
    ksListExpenses: [{ id: "expense-1" }],
  };
  function withFailure(failedCall) {
    return new Proxy(deps, {
      get(target, key) {
        if (key in values) return async () => {
          if (key === failedCall) throw new Error(`${key} unavailable`);
          return values[key];
        };
        return target[key];
      },
    });
  }
  const { ksLoadBalanceData } = createSplitBalances(withFailure(null));
  assert.deepEqual(await ksLoadBalanceData("isolated-group"), {
    balances: values.ksComputeBalances,
    settlements: values.ksListSettlements,
    expenses: values.ksListExpenses,
  });
  for (const call of Object.keys(values)) {
    const { ksLoadBalanceData: failedLoad } = createSplitBalances(withFailure(call));
    await assert.rejects(failedLoad("isolated-group"), new RegExp(`${call} unavailable`));
  }
});

test("Split settlement writes await confirmation for real and guest records", async () => {
  const calls = [];
  const pending = [];
  const settlementDeps = new Proxy(deps, {
    get(target, key) {
      if (key === "ksRecordGuestSettlement" || key === "ksRecordSettlement" || key === "ksDeleteGuestSettlement" || key === "ksDeleteSettlement") {
        return (...args) => {
          calls.push([key, args]);
          return new Promise((resolve, reject) => { pending.push({ resolve, reject }); });
        };
      }
      return target[key];
    },
  });
  const { ksRecordSelectedSettlement, ksDeleteSelectedSettlement } = createSplitBalances(settlementDeps);
  const settlement = { fromId: "guest:one", toId: "me", amount: 25, note: "Cash", by: "me", byName: "Me" };
  for (const guest of [true, false]) {
    let confirmed = false;
    const recording = ksRecordSelectedSettlement(guest, "group-1", settlement).then(() => { confirmed = true; });
    await Promise.resolve();
    assert.equal(confirmed, false);
    pending.at(-1).resolve(true);
    await recording;
    assert.equal(confirmed, true);
  }
  for (const guest of [true, false]) {
    let confirmed = false;
    const deleting = ksDeleteSelectedSettlement(guest, "group-1", "settlement-1", "me", "Me").then(() => { confirmed = true; });
    await Promise.resolve();
    assert.equal(confirmed, false);
    pending.at(-1).resolve(true);
    await deleting;
    assert.equal(confirmed, true);
  }
  assert.deepEqual(calls.map(([key]) => key), [
    "ksRecordGuestSettlement", "ksRecordSettlement", "ksDeleteGuestSettlement", "ksDeleteSettlement",
  ]);
  for (const operation of [
    () => ksRecordSelectedSettlement(true, "group-1", settlement),
    () => ksDeleteSelectedSettlement(true, "group-1", "settlement-1", "me", "Me"),
  ]) {
    const result = operation();
    pending.at(-1).reject(new Error("Cloud write failed"));
    await assert.rejects(result, /Cloud write failed/);
  }
});

test("Split settlement preview retains the summary and transaction details", () => {
  const { KsSettlementPreviewModal, ksSettlementStats } = createSplitBalances(deps);
  assert.deepEqual(ksSettlementStats([{ user_id: "me", paid: 300, owed: 200, net: 100 }], "me"), {
    totalExpenses: 300, perPerson: 300, yourShare: 200, yourPaid: 300, yourBalance: 100,
  });
  const html = renderToString(React.createElement(KsSettlementPreviewModal, {
    open: true, onClose() {}, onDownload() {},
    group: { name: "Test group" },
    simplified: [], people: [{ user_id: "me", display_name: "Me", paid: 300, owed: 200, net: 100 }],
    userId: "me", transactions: [{ description: "Lunch", payerName: "Me", amount: 300 }],
  }));
  assert.match(html, /Settlement summary/);
  assert.match(html, /Test group/);
  assert.match(html, /Lunch/);
  assert.match(html, /Download \/ Share/);
});

test("Split UPI link encodes payment fields", () => {
  const { ksUpiLink } = createSplitBalances(deps);
  assert.equal(ksUpiLink({ pa: "name@bank", pn: "A & B", am: 75.5, tn: "Test group" }),
    "upi://pay?pa=name@bank&pn=A%20%26%20B&am=75.50&cu=INR&tn=Test%20group");
});

test("Split settlement dialog retains amount and UPI actions", () => {
  const { KsSettleModal } = createSplitBalances(deps);
  const html = renderToString(React.createElement(KsSettleModal, {
    open: true, onClose() {}, onDone() {},
    group: { id: "isolated-group", name: "Test group" },
    session: { user: { id: "me" } },
    transfer: { from_id: "me", from_name: "Me", to_id: "friend", to_name: "Alex", amount: 75.5 },
  }));
  assert.match(html, /Record a settlement/);
  assert.match(html, /Amount/);
  assert.match(html, /Pay via UPI app/);
  assert.match(html, /Record it/);
});
