import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createTransactionsPage } from "../src/features/transactions/page.js";
import { createTransactionModals } from "../src/features/transactions/modals.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, Button: box, Card: box,
  Check: icon, CategoryCell: ({ transaction }) => React.createElement("span", null, transaction?.category),
  EmptyState: ({ title }) => React.createElement("p", null, title),
  ExportModal: () => null, Field: ({ label, children }) => React.createElement("div", null, label, children),
  FileText: icon, Flag: icon,
  HowItWorksButton: () => null, IconButton: icon, Info: icon, ListChecks: icon,
  LoadMoreRow: () => null, Modal: ({ open, title, children }) => open
    ? React.createElement("div", null, title, children) : null,
  NameRulesManager: () => null, Paperclip: icon, Pill: box, Plus: icon,
  Receipt: icon, Repeat: icon, SYSTEM_TAGS: [], Search: icon,
  SlidersHorizontal: icon, Sparkles: icon, TagEditorModal: () => null, Target: icon,
  Trash2: icon, X: icon, detectAnomalies: () => [],
  extractLearnableKeyword: () => "", formatCurrency: n => `₹${n}`,
  formatDateDisplay: s => s, hasSystemTag: () => false,
  inPeriod: () => true, inputCls: "", isRecurringTx: () => false,
  normalizeMerchant: s => (s || "").toLowerCase(), selectCls: "", uid: () => "new",
};
const settings = {
  accounts: ["Checking"], categories: ["Groceries"], goals: [],
  recurring: [], subscriptions: [], selectedPeriod: "all",
};
function render(transactions) {
  const Page = createTransactionsPage(deps);
  return renderToString(React.createElement(Page, {
    transactions, settings, allTags: [], onConfirmEditTx() {}, onDeleteTx() {},
    onDeleteTxs() {}, onSplitTx() {}, onSaveTagsForTx() {}, onSaveSettings() {},
    onOpenTarget() {}, onPresetUsed() {},
  }));
}

test("extracted Transactions page renders filters with no entries", () => {
  const html = render([]);
  assert.match(html, /Search merchant, category, or tag/);
  assert.match(html, /All accounts/);
});

test("extracted Transactions page shows a saved transaction", () => {
  const html = render([{ id: "one", date: "2026-10-10", type: "expense",
    amount: 500, merchant: "Market", category: "Groceries", account: "Checking", tags: [] }]);
  assert.match(html, /Market/);
  assert.match(html, /Groceries/);
  assert.match(html, /₹500/);
});

test("extracted transaction detail and split dialogs retain editing fields", () => {
  const { TransactionDetailModal, SplitTransactionModal } = createTransactionModals(deps);
  const tx = { id: "one", date: "2026-10-10", type: "expense", amount: 500,
    merchant: "Market", category: "Groceries", account: "Checking", tags: [] };
  const detail = renderToString(React.createElement(TransactionDetailModal, {
    tx, open: true, settings, onClose() {}, onSave() {}, onSaveSettings() {},
  }));
  const split = renderToString(React.createElement(SplitTransactionModal, {
    tx, open: true, categories: settings.categories, onClose() {}, onSave() {},
  }));
  assert.match(detail, /Details/);
  assert.match(detail, /Payment method/);
  assert.match(split, /Split/);
  assert.match(split, /Add another split/);
});
