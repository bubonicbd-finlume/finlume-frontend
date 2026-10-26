import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createTimelinePage } from "../src/features/timeline/page.js";

const Card = ({ children, ...props }) => React.createElement("section", props, children);
const TimelinePage = createTimelinePage({
  Card,
  dtBuildInstances: () => [],
  formatCurrency: value => "₹" + Number(value).toFixed(2),
  formatDateDisplay: value => value,
  liabilityEffectivePayment: () => 0,
  todayYMD: () => "2026-10-25"
});

test("financial timeline offers month, week and agenda views", () => {
  const html = renderToString(React.createElement(TimelinePage, {
    transactions: [],
    settings: { datesToRemember: [], recurring: [], subscriptions: [], netWorthAccounts: [], goals: [] },
    onGoTo: () => {}
  }));
  assert.match(html, />Month</);
  assert.match(html, />Week</);
  assert.match(html, />Agenda</);
});
