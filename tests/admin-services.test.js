import test from "node:test";
import assert from "node:assert/strict";
import { createAdminServices } from "../src/features/admin/services.js";

test("Administration services retain scanner settings defaults and RPC arguments", async () => {
  const calls = [];
  const services = createAdminServices({ rpc: async (name, args) => {
    calls.push([name, args]);
    if (name === "krnshare_admin_get_scanner_settings") return { data: [{ global_enabled: true, access_mode: "all" }], error: null };
    return { data: null, error: null };
  } });
  assert.deepEqual(await services.ksAdminGetScannerSettings(), { globalEnabled: true, accessMode: "all" });
  await services.ksAdminSetScannerUserAccess("user-1", false);
  await services.ksAdminListScannerAuditLog();
  assert.deepEqual(calls, [
    ["krnshare_admin_get_scanner_settings", undefined],
    ["krnshare_admin_set_scanner_user_access", { p_user: "user-1", p_enabled: false }],
    ["krnshare_admin_list_scanner_audit_log", { p_limit: 100 }],
  ]);
});

test("Administration services preserve empty results and server errors", async () => {
  const serverError = new Error("Access denied");
  const services = createAdminServices({ rpc: async name => {
    if (name === "krnshare_admin_force_logout") return { data: null, error: serverError };
    return { data: null, error: null };
  } });
  assert.deepEqual(await services.ksAdminOverviewStats(), { group_count: 0, user_count: 0, expense_count: 0, failed_count: 0 });
  assert.deepEqual(await services.ksAdminListFailedExpenses(), []);
  await assert.rejects(services.ksAdminForceLogout("user@example.test"), error => error === serverError);
});
