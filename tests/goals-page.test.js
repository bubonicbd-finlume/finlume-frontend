import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createGoalsPage } from "../src/features/goals/page.js";
import { createGoalWhatIf } from "../src/features/goals/what-if.js";

const passthrough = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, Button: passthrough, Card: passthrough, Check: icon,
  ChevronDown: icon, EmptyState: ({ title }) => React.createElement("p", null, title),
  Field: passthrough, IconButton: icon, ListChecks: icon, ManageEntryModal: () => null,
  Modal: ({ open, title, children }) => open ? React.createElement("div", null, title, children) : null,
  Pencil: icon, Plus: icon, ProgressBar: () => null, Repeat: icon, Search: icon,
  Sparkles: icon, Target: icon, Trash2: icon, WhatIfAssumptions: passthrough,
  analyzePurchaseQuery: () => null,
  computeGoalContributionPlan: () => ({ coverage: 1, status: "On track", plannedMonthly: 500,
    requiredMonthly: 500, months: 6 }),
  formatCurrency: n => `₹${n}`, formatDateDisplay: s => s || "",
  parseYMD: s => new Date(`${s}T00:00:00`), todayYMD: () => "2026-10-17", uid: () => "new",
};

test("extracted Goals planner renders purchase tools with no saved goals", () => {
  const Page = createGoalsPage(deps);
  const html = renderToString(React.createElement(Page, {
    mode: "planner", settings: { goals: [], purchaseLog: [] }, transactions: [], onSaveSettings() {},
  }));
  assert.match(html, /Purchase Planner/);
  assert.match(html, /Check whether a purchase/);
  assert.match(html, /I want to buy a phone/);
});

test("extracted embedded Goals view renders a saved goal", () => {
  const Page = createGoalsPage(deps);
  const html = renderToString(React.createElement(Page, {
    mode: "goals", embedded: true,
    settings: { goals: [{ id: "emergency", name: "Emergency fund", target: 30000, current: 10000,
      plannedMonthly: 500, dueDate: "2027-04-17", createdAt: "2026-04-17", isEmergencyFund: true }] },
    transactions: [], onSaveSettings() {},
  }));
  assert.match(html, /Emergency fund/);
  assert.match(html, /₹10000/);
  assert.match(html, /monthly/);
});

test("goal form includes inflation, priority and status planning fields", () => {
  const Page = createGoalsPage({ ...deps, ManageEntryModal: ({ fields, initial }) => React.createElement("div", null, fields.map(field => field.name).join(","), ":" + initial.priority + ":" + initial.status) });
  const html = renderToString(React.createElement(Page, { mode: "goals", settings: { goals: [] }, transactions: [], onSaveSettings() {} }));
  assert.match(html, /inflationRate/);
  assert.match(html, /priority/);
  assert.match(html, /status/);
  assert.match(html, /:Medium:Active/);
});

test("extracted goal what-if dialog renders an isolated scenario", () => {
  const WhatIf = createGoalWhatIf(deps);
  const html = renderToString(React.createElement(WhatIf, {
    open: true, goal: { name: "Emergency fund", target: 30000, current: 10000, dueDate: "2027-04-17" }, onClose() {},
  }));
  assert.match(html, /Emergency fund/);
});
