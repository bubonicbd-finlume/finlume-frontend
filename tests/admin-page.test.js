import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createAdminPage } from "../src/features/admin/page.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AdminAuditPanel: box, AdminHealthPanel: box, AdminOverviewPanel: box,
  AlertTriangle: icon, CheckCircle: icon, ImportCsvModal: () => null,
  Area: box, AreaChart: box, Bar: box, Button: box, CalendarClock: icon, Users: icon,
  Card: box, CartesianGrid: box, EmptyState: box, FEEDBACK_CATEGORIES: [],
  History: icon, KsErrorNote: box, KsAdminOverviewTab: box, KsAdminAnnouncementsTab: box, KsAdminFailedExpensesTab: box,
  KsAdminScannerPanel: box, KsAdminUsersTab: box, Loader2: icon,
  MessageSquare: icon, Modal: box, RBarChart: box, Receipt: icon,
  ResponsiveContainer: box, Search: icon, ShieldCheck: icon, SummaryCard: box,
  Tooltip: box, TrendingUp: icon, UserPlus: icon, XAxis: box, YAxis: box,
  adminDownloadCsv: () => {}, enrichNarration: () => ({}), fingerprintOf: () => "fingerprint",
  fetchFeedback: async () => [], nowISO: () => "2026-10-18T00:00:00Z", uid: () => "id-1",
  formatDateDisplay: () => "18 Oct 2026", inputCls: "", selectCls: "",
  supabaseClient: { from: () => ({ select: () => ({ order: async () => ({ data: [] }) }) }) },
  ksAdminOverviewStats: async () => ({}), updateFeedbackStatus: async () => {},
};

test("Admin page renders its overview while data loads", () => {
  const AdminPage = createAdminPage(deps);
  const html = renderToString(React.createElement(AdminPage, { adminEmail: "admin@example.test" }));
  assert.match(html, /Admin sections/);
  assert.match(html, /Overview/);
});
