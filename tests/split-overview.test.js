import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSplitOverview } from "../src/features/split/overview.js";

const icon = () => null;
const box = ({ children, className }) => React.createElement("div", { className }, children);
const deps = new Proxy({
  Card: box,
  Skeleton: box,
  ksErrorText: error => String(error),
  ksMoney: value => `₹${Number(value).toFixed(2)}`,
  todayYMD: () => "2026-10-19",
  ksListGroups: async () => [{ id: "group-a", name: "Trip", icon: "friends", member_count: 2 }],
  ksComputeBalances: async () => ({ people: [{ user_id: "me", net: 75, display_name: "Me" }], simplified: [] }),
  ksListExpenses: async () => [{
    id: "expense-a", expense_date: "2026-10-12", created_at: "2026-10-12T10:00:00Z",
    amount: 100, category: "Food", description: "Lunch", payer_id: "me", payer_name: "Me",
    splits_json: [{ user_id: "me" }, { user_id: "friend" }],
  }],
  ksListGuestExpenses: async () => [{ id: "guest-expense", date: "2026-10-14", amount: 20, category: "Food", description: "Shared tea", payerId: "me", splits: [{ id: "me", share: 10 }, { id: "guest:one", share: 10 }] }],
  ksListGuestSettlements: async () => [{ fromId: "guest:one", toId: "me", amount: 10, settledAt: "2026-10-15T10:00:00Z", deleted: false }],
  ksListGuests: async () => [{ id: "guest:one", name: "Test Guest" }],
  ksComputeGuestSettlement: (participants, expenses, settlements) => {
    const net = new Map(participants.map(person => [person.id, 0]));
    for (const expense of expenses) { net.set(expense.payerId, net.get(expense.payerId) + expense.amount); for (const share of expense.splits) net.set(share.id, net.get(share.id) - share.share); }
    for (const settlement of settlements) { net.set(settlement.fromId, net.get(settlement.fromId) + settlement.amount); net.set(settlement.toId, net.get(settlement.toId) - settlement.amount); }
    return { net };
  },
  ksListSettlements: async () => [{ amount: 25, created_at: "2026-10-13T10:00:00Z" }],
}, { get(target, key) { return key in target ? target[key] : icon; } });

test("Split overview keeps its loading screen", () => {
  const { KrnShareOverviewPage } = createSplitOverview(deps);
  const html = renderToString(React.createElement(KrnShareOverviewPage, {
    session: { user: { id: "me" } }, onOpenGroup() {}, refreshKey: 0,
  }));
  assert.match(html, /grid-cols-2/);
  assert.equal((html.match(/class="h-3\.5 w-2\/3 mb-3"/g) || []).length, 4);
});

test("Split overview combines group balances, monthly spending and settlements", async () => {
  const { ksLoadOverview } = createSplitOverview(deps);
  const data = await ksLoadOverview("me");
  assert.equal(data.groups[0].net, 75);
  assert.equal(data.youAreOwed, 75);
  assert.equal(data.youOwe, 0);
  assert.equal(data.totalThisMonth, 120);
  assert.equal(data.settledThisMonth, 35);
  assert.deepEqual(data.categoryBreakdown, [{ category: "Food", amount: 120 }]);
  assert.equal(data.activity[0].description, "Shared tea");
});

test("Split overview refuses to present partial totals as zero", async () => {
  for (const failedCall of ["ksComputeBalances", "ksListExpenses", "ksListGuestExpenses", "ksListGuestSettlements", "ksListGuests", "ksListSettlements"]) {
    const failedDeps = new Proxy(deps, {
      get(target, key) {
        if (key === failedCall) return async () => { throw new Error(`${failedCall} unavailable`); };
        return target[key];
      },
    });
    const { ksLoadOverview } = createSplitOverview(failedDeps);
    await assert.rejects(ksLoadOverview("me"), new RegExp(`${failedCall} unavailable`));
  }
});
