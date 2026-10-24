import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createDatesPage } from "../src/features/dates/page.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  Button: box, CalendarDays: icon, Card: box, Check: icon,
  DATE_CATEGORIES: [{ id: "bills", label: "Bills", color: "#E74C3C" }],
  DATE_RECURRENCES: [{ id: "once", label: "One-time" }], DATE_REMINDERS: [0],
  DATE_URGENCY_STYLE: { soon: { border: "", bg: "", text: "" } },
  DATES_PURGE_DAYS: 30, DATES_UPCOMING_DAYS: 30,
  Edit: icon, EmptyState: box, Field: box, Modal: () => null,
  Pencil: icon, Plus: icon, Trash2: icon, Undo: icon,
  dtAddDays: () => "2026-10-19", dtAddRule: () => [],
  dtBuildInstances: () => [], dtCategory: () => ({ label: "Bills", color: "#E74C3C" }),
  dtDaysBetween: () => 1, dtDeleteInstance: () => [], dtDueLabel: () => "Tomorrow",
  dtEditInstance: () => [], dtIsOnce: () => true, dtLocalToday: () => "2026-10-18",
  dtPatchOverride: () => [], dtUrgency: () => "soon", dtValidYMD: () => true,
  formatCurrency: () => "₹100", formatDateDisplay: () => "19 Oct 2026",
  inputCls: "", selectCls: "",
};

test("Dates page renders with an empty account", () => {
  const DatesPage = createDatesPage(deps);
  const html = renderToString(React.createElement(DatesPage, {
    settings: { datesToRemember: [], accounts: [] },
    onSaveSettings: () => {},
  }));
  assert.match(html, /Bills, renewals and deadlines/);
  assert.match(html, /Add date/);
});

test("Dates page renders an upcoming bill", () => {
  const DatesPage = createDatesPage({
    ...deps,
    dtBuildInstances: () => [{
      key: "bill-1", id: "bill-1", name: "Rent", category: "bills",
      dueDate: "2026-10-19", recurrence: "once", amount: 100,
      account: "", paid: false, rule: { recurrence: "once" },
    }],
  });
  const html = renderToString(React.createElement(DatesPage, {
    settings: { datesToRemember: [{ id: "bill-1" }], accounts: [] },
    onSaveSettings: () => {},
  }));
  assert.match(html, /Rent/);
  assert.match(html, /Tomorrow/);
});

test("Dates page keeps malformed saved entries from crashing the page", () => {
  const DatesPage = createDatesPage({
    ...deps,
    dtBuildInstances: rules => {
      assert.deepEqual(rules.map(rule => rule.name), ["Rent"]);
      return [];
    },
  });
  const html = renderToString(React.createElement(DatesPage, {
    settings: { datesToRemember: [null, { id: "bad", name: 12, dueDate: "2026-10-19" }, { id: "good", name: "Rent", dueDate: "2026-10-19" }], accounts: [] },
    onSaveSettings: () => {},
  }));
  assert.match(html, /2 saved date entries have an invalid format/);
  assert.match(html, /Existing entries are preserved/);
});

test("Dates page remains usable when saved account choices are malformed", () => {
  const DatesPage = createDatesPage(deps);
  const html = renderToString(React.createElement(DatesPage, {
    settings: { datesToRemember: [], accounts: { unexpected: "Checking" } },
    onSaveSettings: () => {},
  }));
  assert.match(html, /Add date/);
  assert.match(html, /All categories/);
});
