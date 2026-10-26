import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createRecurringSubscriptionsPage } from "../src/features/recurring/page.js";
import { createSuggestionCard } from "../src/features/recurring/suggestion.js";
import { createLinkTransactionModal } from "../src/features/recurring/link-modal.js";

const passthrough = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, Button: passthrough, CalendarClock: icon, Card: passthrough,
  ChevronDown: icon, EmptyState: ({ title }) => React.createElement("p", null, title),
  HowItWorksButton: () => null, IconButton: icon, Link2: icon, ListChecks: icon,
  ManageEntryModal: () => null, Modal: ({ title, children }) => React.createElement("div", null, title, children), Pencil: icon, Plus: icon,
  Repeat: icon, Sparkles: icon, SummaryCard: ({ label }) => React.createElement("div", null, label),
  detectRecurringAmountAnomalies: () => [], detectRecurringCandidates: () => [],
  detectSubscriptionCreep: () => [], detectSubscriptionPriceIncreases: () => [],
  formatCurrency: n => `₹${n}`, formatDateDisplay: s => s || "", inputCls: "",
  insertNotification: async () => {}, monthlyEquivalent: n => Number(n) || 0,
  normalizeMerchant: s => String(s || "").toLowerCase().trim(),
  todayYMD: () => "2026-10-17", uid: () => "new",
};

const emptySettings = {
  recurring: [], subscriptions: [], dismissedPatterns: [], categories: ["Bills"], accounts: [],
};

test("extracted recurring page renders an empty account", () => {
  const Page = createRecurringSubscriptionsPage(deps);
  const html = renderToString(React.createElement(Page, {
    transactions: [], settings: emptySettings, onSaveSettings() {}, userId: null,
  }));
  assert.match(html, /Monthly commitment/);
  assert.match(html, /Confirmed items/);
  assert.match(html, /Active detection/);
});

test("extracted recurring page renders a confirmed item", () => {
  const Page = createRecurringSubscriptionsPage(deps);
  const html = renderToString(React.createElement(Page, {
    transactions: [], settings: {
      ...emptySettings,
      recurring: [{ id: "rent", name: "Rent", category: "Bills", amount: 12000, cadence: "monthly", nextDate: "2026-11-01", active: true }],
    }, onSaveSettings() {}, userId: null,
  }));
  assert.match(html, /Rent/);
  assert.match(html, /₹12000/);
});

test("recurring form exposes income, custom intervals and pause or cancel status", () => {
  const Page = createRecurringSubscriptionsPage({ ...deps, ManageEntryModal: ({ fields, initial }) => React.createElement("div", null, fields.map(field => field.name).join(","), `:${initial.status}`) });
  const html = renderToString(React.createElement(Page, { transactions: [], settings: emptySettings, onSaveSettings() {}, userId: null }));
  assert.match(html, /type,status,name/);
  assert.match(html, /intervalDays/);
  assert.match(html, /trialStartDate/);
  assert.match(html, /trialEndDate/);
  assert.match(html, /:active/);
});

test("a due schedule offers explicit confirmed posting", () => {
  const Page = createRecurringSubscriptionsPage(deps);
  const html = renderToString(React.createElement(Page, { transactions: [], settings: { ...emptySettings, recurring: [{ id: "rent", name: "Rent", amount: 100, cadence: "monthly", nextDate: "2026-10-17", active: true }] }, onSaveSettings() {}, onPostRecurringOccurrence() {}, userId: null }));
  assert.match(html, /Record due/);
});

test("due schedule confirmation includes a skip action", () => {
  const Page = createRecurringSubscriptionsPage(deps);
  const html = renderToString(React.createElement(Page, { transactions: [], settings: { ...emptySettings, recurring: [{ id: "rent", name: "Rent", amount: 100, cadence: "monthly", nextDate: "2026-10-17", active: true }] }, onSaveSettings() {}, onPostRecurringOccurrence() {}, onSkipRecurringOccurrence() {}, userId: null }));
  assert.match(html, /Skip occurrence/);
});

test("extracted suggestion and link dialog render candidate data", () => {
  const Suggestion = createSuggestionCard(deps);
  const LinkModal = createLinkTransactionModal(deps);
  const suggestion = renderToString(React.createElement(Suggestion, {
    c: { displayMerchant: "Cloud storage", category: "Bills", cadence: "monthly", confidence: "high",
      confidenceScore: 91, occurrences: 4, avgAmount: 199, monthlyEquivalent: 199,
      matchReason: "Regular monthly charge", nextDate: "2026-11-01" }, onKeep() {}, onIgnore() {},
  }));
  const modal = renderToString(React.createElement(LinkModal, {
    open: true, onClose() {}, onLink() {},
    transactions: [{ type: "expense", merchant: "Cloud storage", amount: 199, date: "2026-10-01" }],
  }));
  assert.match(suggestion, /Cloud storage/);
  assert.match(suggestion, /Regular monthly charge/);
  assert.match(modal, /Link a transaction/);
  assert.match(modal, /Cloud storage/);
});
