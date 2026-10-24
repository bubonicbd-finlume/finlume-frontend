import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createAdminMonitoringPanels } from "../src/features/admin/monitoring.js";

const box = ({ children }) => React.createElement("div", null, children);
const deps = {
  Button: box, CalendarClock: () => null, Card: box, KsAdminOverviewTab: box,
  Loader2: () => null, MessageSquare: () => null, SummaryCard: box,
  TrendingUp: () => null, Users: () => null,
  ksAdminGetScannerSettings: async () => ({}),
  ksAdminListAnnouncements: async () => [],
  ksAdminOverviewStats: async () => ({}),
  supabaseClient: {},
};

test("Administration overview renders with empty activity", () => {
  const { AdminOverviewPanel } = createAdminMonitoringPanels(deps);
  const html = renderToString(React.createElement(AdminOverviewPanel, {
    profiles: [], feedback: [], stats: {}, onGo: () => {},
  }));
  assert.match(html, /Finance app/);
});

test("Administration audit and health panels render their loading states", () => {
  const { AdminAuditPanel, AdminHealthPanel } = createAdminMonitoringPanels(deps);
  const audit = renderToString(React.createElement(AdminAuditPanel));
  const health = renderToString(React.createElement(AdminHealthPanel));
  assert.match(audit, /Audit|Loading/i);
  assert.match(health, /Health|Loading/i);
});
