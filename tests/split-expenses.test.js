import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSplitExpenses } from "../src/features/split/expenses.js";

const empty = () => null;
const box = ({ children }) => React.createElement("div", null, children);
const deps = new Proxy({
  Button: ({ children }) => React.createElement("button", null, children),
  Card: box,
  Modal: ({ open, title, children }) => open
    ? React.createElement("section", null, React.createElement("h2", null, title), children)
    : null,
  KS_CATEGORIES: [{ value: "Food" }],
  ksPersonLabel: member => member.display_name,
  KsExpenseModal: empty,
  KsReceiptScannerModal: empty,
  Skeleton: box,
  ksComputeDirectDebts: () => [],
  selectCls: "",
  todayYMD: () => "2026-10-18",
}, {
  get(target, key) { return key in target ? target[key] : empty; },
});

test("Split guest expense deletion awaits and reports cloud failure", async () => {
  let rejectWrite;
  const calls = [];
  const custom = new Proxy(deps, {
    get(target, key) {
      if (key === "ksDeleteGuestExpenseRow") return (...args) => {
        calls.push([key, args]);
        return new Promise((resolve, reject) => { rejectWrite = reject; });
      };
      if (key === "ksDeleteExpense") return (...args) => { calls.push([key, args]); return Promise.resolve(true); };
      return target[key];
    },
  });
  const { ksDeleteSelectedExpense } = createSplitExpenses(custom);
  const guestDelete = ksDeleteSelectedExpense("group-1", { id: "expense-1", isLocalGuest: true });
  assert.deepEqual(calls, [["ksDeleteGuestExpenseRow", ["group-1", "expense-1"]]]);
  rejectWrite(new Error("Cloud unavailable"));
  await assert.rejects(guestDelete, /Cloud unavailable/);
  await ksDeleteSelectedExpense("group-1", { id: "expense-2" });
  assert.deepEqual(calls.at(-1), ["ksDeleteExpense", ["expense-2"]]);
});

test("Split real expense deletion requires an affirmative RPC result", async () => {
  for (const result of [false, null]) {
    const custom = new Proxy(deps, {
      get(target, key) {
        if (key === "ksDeleteExpense") return async () => result;
        return target[key];
      },
    });
    const { ksDeleteSelectedExpense, ksDeleteConfirmedExpense } = createSplitExpenses(custom);
    await assert.rejects(ksDeleteSelectedExpense("group-1", { id: "expense-1" }), /not deleted/);
    await assert.rejects(ksDeleteConfirmedExpense("expense-2"), /not deleted/);
  }
  const custom = new Proxy(deps, {
    get(target, key) {
      if (key === "ksDeleteExpense") return async () => true;
      return target[key];
    },
  });
  const { ksDeleteConfirmedExpense } = createSplitExpenses(custom);
  assert.equal(await ksDeleteConfirmedExpense("expense-1"), true);
});

test("Split bulk deletion reports exactly which writes completed", async () => {
  const calls = [];
  const custom = new Proxy(deps, {
    get(target, key) {
      if (key === "ksDeleteExpense") return async id => {
        calls.push(id);
        return id !== "expense-2";
      };
      return target[key];
    },
  });
  const { ksDeleteExpensesInOrder } = createSplitExpenses(custom);
  await assert.rejects(ksDeleteExpensesInOrder(["expense-1", "expense-2", "expense-3"]), error => {
    assert.deepEqual(error.completedIds, ["expense-1"]);
    return true;
  });
  assert.deepEqual(calls, ["expense-1", "expense-2"]);
  assert.deepEqual(await ksDeleteExpensesInOrder(["expense-3"]), ["expense-3"]);
});

test("Split bulk recategorization tracks confirmed changes and skips matching rows", async () => {
  const calls = [];
  const custom = new Proxy(deps, {
    get(target, key) {
      if (key === "ksEditExpense") return async payload => {
        calls.push(payload.expenseId);
        return payload.expenseId !== "expense-3";
      };
      return target[key];
    },
  });
  const { ksRecategorizeExpensesInOrder } = createSplitExpenses(custom);
  const rows = [
    { id: "expense-1", category: "Food" },
    { id: "expense-2", category: "Travel" },
    { id: "expense-3", category: "Bills" },
    { id: "expense-4", category: "Travel" },
  ];
  const payload = (row, overrides) => ({ category: row.category, ...overrides });
  await assert.rejects(ksRecategorizeExpensesInOrder(rows, "Travel", payload), error => {
    assert.deepEqual(error.completed.map(row => row.id), ["expense-1"]);
    return true;
  });
  assert.deepEqual(calls, ["expense-1", "expense-3"]);
  assert.deepEqual(await ksRecategorizeExpensesInOrder(rows.slice(1, 2), "Travel", payload), []);
});

test("Split import retries failed rows without re-saving confirmed rows", async () => {
  const calls = [];
  const custom = new Proxy(deps, {
    get(target, key) {
      if (key === "ksEqualPaise") return amount => [amount];
      if (key === "ksToPaise") return amount => Math.round(amount * 100);
      if (key === "ksFromPaise") return amount => amount / 100;
      if (key === "ksAddExpense") return async payload => {
        calls.push(payload.description);
        if (payload.description === "Second" && calls.filter(name => name === "Second").length === 1) throw new Error("Offline");
        return "saved";
      };
      return target[key];
    },
  });
  const { ksImportExpenseRows } = createSplitExpenses(custom);
  const rows = [
    { valid: true, amount: 10, category: "Food", description: "First", date: "2026-10-20", payerId: "me" },
    { valid: true, amount: 20, category: "Food", description: "Second", date: "2026-10-20", payerId: "me" },
    { valid: false, amount: 30, category: "Food", description: "Invalid", date: "2026-10-20", payerId: "me" },
  ];
  const first = await ksImportExpenseRows(rows, "group-1", [{ user_id: "me" }], "me");
  assert.deepEqual(first, { imported: [0], failed: [1] });
  rows[0].imported = true;
  const second = await ksImportExpenseRows(rows, "group-1", [{ user_id: "me" }], "me");
  assert.deepEqual(second, { imported: [1], failed: [] });
  assert.deepEqual(calls, ["First", "Second", "Second"]);
});

test("Split import rejects oversized files before parsing", () => {
  const { ksCheckImportFileSize } = createSplitExpenses(deps);
  assert.doesNotThrow(() => ksCheckImportFileSize({ size: 10 * 1024 * 1024 }));
  assert.throws(() => ksCheckImportFileSize({ size: 10 * 1024 * 1024 + 1 }), error => {
    assert.equal(error.name, "SplitImportTooLargeError");
    assert.match(error.message, /10 MB/);
    return true;
  });
});

test("Split group overview rejects a failed financial read", async () => {
  const values = {
    ksComputeBalances: { people: [], simplified: [] },
    ksListExpenses: [{ id: "expense-1" }],
    ksListSettlements: [{ id: "settlement-1" }],
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
  const { ksLoadGroupOverviewData } = createSplitExpenses(withFailure(null));
  assert.deepEqual(await ksLoadGroupOverviewData("group-1"), {
    balances: values.ksComputeBalances,
    expenses: values.ksListExpenses,
    settlements: values.ksListSettlements,
  });
  for (const call of Object.keys(values)) {
    const { ksLoadGroupOverviewData: failedLoad } = createSplitExpenses(withFailure(call));
    await assert.rejects(failedLoad("group-1"), new RegExp(`${call} unavailable`));
  }
});

test("Split expenses card retains its loading state and add action", () => {
  const { KsExpensesCard } = createSplitExpenses(deps);
  const html = renderToString(React.createElement(KsExpensesCard, {
    group: { id: "isolated-group" },
    session: { user: { id: "isolated-user" } },
    members: [], guests: [], isCreator: false,
    onToast() {}, onChanged() {},
  }));
  assert.match(html, /Expenses/);
  assert.match(html, /Add expense/);
});

test("Split group overview keeps its loading card in the expenses feature", () => {
  const { KsGroupOverviewCard } = createSplitExpenses(deps);
  const html = renderToString(React.createElement(KsGroupOverviewCard, {
    group: { id: "isolated-group" },
    session: { user: { id: "isolated-user" } },
    members: [], refreshKey: 0,
  }));
  assert.match(html, /Overview/);
  assert.match(html, /grid sm:grid-cols-2/);
});

test("Split import dialog retains CSV and Excel file selection", () => {
  const { KsCsvImportModal } = createSplitExpenses(deps);
  const html = renderToString(React.createElement(KsCsvImportModal, {
    open: true, onClose() {},
    group: { id: "isolated-group" },
    members: [],
    session: { user: { id: "isolated-user" } },
    onDone() {},
  }));
  assert.match(html, /Import expenses/);
  assert.match(html, /\.csv/);
  assert.match(html, /\.xlsx/);
});

test("Split import keeps payer and category mapping while rejecting invalid amounts", () => {
  const { normalizeImportRow } = createSplitExpenses(deps);
  const members = [{ user_id: "friend", display_name: "Alex", email: "alex@example.test" }];
  const ready = normalizeImportRow({
    Description: "Lunch", Amount: "250.50", Date: "2026-10-18",
    Category: "Food", "Paid By": "Alex",
  }, members, "me");
  assert.deepEqual({
    description: ready.description, amount: ready.amount, category: ready.category,
    payerId: ready.payerId, valid: ready.valid,
  }, { description: "Lunch", amount: 250.5, category: "Food", payerId: "friend", valid: true });

  const invalid = normalizeImportRow({ Description: "Lunch", Amount: "not an amount" }, members, "me");
  assert.equal(invalid.valid, false);
  assert.match(invalid.problems.join(", "), /invalid amount/);
});
