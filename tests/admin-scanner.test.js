import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createAdminScannerPanel } from "../src/features/admin/scanner.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  Button: box, Card: box, EmptyState: box, Loader2: () => React.createElement("span", null, "Loading scanner"),
  ShieldAlert: icon, ShieldCheck: icon, ToggleSwitch: icon,
  inputCls: "", ksAdminGetScannerSettings: async () => ({}),
  ksAdminListScannerAuditLog: async () => [],
  ksAdminListScannerUsers: async () => [],
  ksAdminSetScannerAccessMode: async () => {},
  ksAdminSetScannerGlobal: async () => {},
  ksAdminSetScannerUserAccess: async () => {},
  ksErrorText: error => String(error),
};

test("Admin scanner panel renders its initial state", () => {
  const ScannerPanel = createAdminScannerPanel(deps);
  const html = renderToString(React.createElement(ScannerPanel));
  assert.match(html, /Loading scanner/);
});
