import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSplitExpenseModal, createSplitQuickAddModal } from "../src/features/split/expense-modal.js";

const icon = () => null;
const deps = {
  AlertTriangle: icon, Check: icon, Loader2: icon,
  Button: ({ children }) => React.createElement("button", null, children),
  Field: ({ label, children }) => React.createElement("label", null, label, children),
  KsAvatar: icon,
  Modal: ({ open, title, footer, children }) => open
    ? React.createElement("section", null, React.createElement("h2", null, title), children, footer)
    : null,
  KS_CATEGORIES: [{ value: "Food", emoji: "🍽" }],
  inputCls: "", selectCls: "",
  ksEqualPaise: (total, count) => Array.from({ length: count }, () => Math.floor(total / count)),
  ksFromPaise: value => value / 100,
  ksIsGuestId: id => id.startsWith("guest:"),
  ksMoney: value => `₹${value.toFixed(2)}`,
  ksPercentPaise: () => [],
  ksPersonLabel: member => member.display_name,
  ksToPaise: value => Math.round(Number(value) * 100) || 0,
  todayYMD: () => "2026-10-18",
};

const props = {
  open: true,
  onClose() {}, onDone() {},
  group: { id: "isolated-group" },
  members: [{ user_id: "me", display_name: "Me" }, { user_id: "friend", display_name: "Alex" }],
  guests: [{ id: "guest:one", name: "Guest" }],
  session: { user: { id: "me" } },
  canLogForOthers: true,
};

test("shared Split expense dialog preserves add and edit entry screens", () => {
  const KsExpenseModal = createSplitExpenseModal(deps);
  const add = renderToString(React.createElement(KsExpenseModal, props));
  assert.match(add, /Add an expense/);
  assert.match(add, /Paid by/);
  assert.match(add, /Equally/);
  assert.match(add, /Exact/);
  assert.match(add, /Percent/);
  assert.match(add, /Guest/);
  assert.match(add, /Add expense/);

  const edit = renderToString(React.createElement(KsExpenseModal, {
    ...props,
    expense: { id: "isolated-expense", payer_id: "me", amount: 100, splits_json: [] },
  }));
  assert.match(edit, /Edit expense/);
  assert.match(edit, /Save changes/);
});

test("Split quick add retains its group chooser loading state", () => {
  const KsQuickAddModal = createSplitQuickAddModal({
    EmptyState: icon, KsErrorNote: icon, KsExpenseModal: icon,
    Modal: deps.Modal, Skeleton: () => React.createElement("span", null, "Loading group"),
    Split: icon,
    ksErrorText: error => String(error),
    ksGroupIcon: () => icon,
    ksListGroups: async () => [],
    ksListGuests: async () => [],
    ksListMembers: async () => [],
  });
  const html = renderToString(React.createElement(KsQuickAddModal, {
    open: true, onClose() {}, session: { user: { id: "isolated-user" } }, onDone() {},
  }));
  assert.match(html, /Add expense to/);
  assert.match(html, /Loading group/);
});
