import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createAdminDialogs } from "../src/features/admin/dialogs.js";

const box = ({ children, title }) => React.createElement("div", null, title, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, Button: box, CheckCircle: icon,
  ImportCsvModal: ({ open }) => open ? React.createElement("div", null, "Import statement") : null,
  Loader2: icon, Modal: box, enrichNarration: () => ({}),
  fingerprintOf: () => "fingerprint", nowISO: () => "2026-10-18T00:00:00Z",
  supabaseClient: { rpc: async () => ({ data: {}, error: null }) }, uid: () => "id-1",
};

test("Admin import dialog retains the statement-import control", () => {
  const { AdminImportModal } = createAdminDialogs(deps);
  const html = renderToString(React.createElement(AdminImportModal, {
    open: true, onClose: () => {}, targetUser: { user_id: "test-user" },
  }));
  assert.match(html, /Import statement/);
});

test("Admin hard-refresh and account-deletion dialogs retain confirmations", () => {
  const { AdminHardRefreshModal, AdminDeleteUserModal } = createAdminDialogs(deps);
  const refresh = renderToString(React.createElement(AdminHardRefreshModal, {
    profiles: [], onClose: () => {},
  }));
  const deletion = renderToString(React.createElement(AdminDeleteUserModal, {
    target: { user_id: "test-user", email: "member@example.test" },
    onClose: () => {}, onDeleted: () => {},
  }));
  assert.match(refresh, /Hard/);
  assert.match(deletion, /Delete user/);
  assert.match(deletion, /member@example\.test/);
});
