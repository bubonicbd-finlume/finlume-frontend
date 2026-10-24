import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createAdminTabs } from "../src/features/admin/tabs.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, Button: box, Card: box, EmptyState: box, Field: box,
  KsErrorNote: () => null, Loader2: icon, LogOut: icon, Megaphone: icon,
  Receipt: icon, ShieldCheck: icon, SummaryCard: box, Trash2: icon,
  User: icon, UserMinus: icon, Users: icon, inputCls: "",
  ksAdminCreateAnnouncement: async () => {}, ksAdminDeactivateUser: async () => {},
  ksAdminDeleteUserByEmail: async () => {}, ksAdminForceLogout: async () => {},
  ksAdminListAnnouncements: async () => [], ksAdminListFailedExpenses: async () => [],
  ksAdminOverviewStats: async () => ({}), ksAdminReactivateUser: async () => {},
  ksAdminSetAnnouncementActive: async () => {}, ksErrorText: error => String(error),
  ksMoney: () => "₹0", supabaseClient: {},
};

test("Split Administration tabs render their initial states", () => {
  const tabs = createAdminTabs(deps);
  for (const name of ["KsAdminOverviewTab", "KsAdminUsersTab", "KsAdminFailedExpensesTab", "KsAdminAnnouncementsTab", "KsAdminPage"]) {
    const html = renderToString(React.createElement(tabs[name], { onToast: () => {} }));
    assert.ok(html.length > 0, `${name} should render`);
  }
});
