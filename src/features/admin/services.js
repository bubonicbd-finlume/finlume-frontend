import { safeCsvValue } from "../../platform/csv-export.js";

export function createAdminServices(supabaseClient) {
  async function rpc(name, args) {
    const { data, error } = await supabaseClient.rpc(name, args);
    if (error) throw error;
    return data;
  }

  function adminDownloadCsv(rows, filename) {
    const esc = value => {
      const text = value == null ? "" : String(safeCsvValue(value));
      return /[\t",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    };
    const csv = rows.map(row => row.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  }

  async function ksAdminGetScannerSettings() {
    const data = await rpc("krnshare_admin_get_scanner_settings");
    const row = Array.isArray(data) ? data[0] : data;
    return { globalEnabled: !!(row && row.global_enabled), accessMode: row && row.access_mode || "selected" };
  }
  async function ksAdminSetScannerGlobal(enabled) {
    await rpc("krnshare_admin_set_scanner_global", { p_enabled: enabled });
  }
  async function ksAdminSetScannerAccessMode(mode) {
    await rpc("krnshare_admin_set_scanner_access_mode", { p_mode: mode });
  }
  async function ksAdminListScannerUsers() {
    return await rpc("krnshare_admin_list_scanner_users") || [];
  }
  async function ksAdminSetScannerUserAccess(userId, enabled) {
    await rpc("krnshare_admin_set_scanner_user_access", { p_user: userId, p_enabled: enabled });
  }
  async function ksAdminListScannerAuditLog(limit = 100) {
    return await rpc("krnshare_admin_list_scanner_audit_log", { p_limit: limit }) || [];
  }
  async function ksAdminOverviewStats() {
    return await rpc("krnshare_admin_overview_stats") || { group_count: 0, user_count: 0, expense_count: 0, failed_count: 0 };
  }
  async function ksAdminDeactivateUser(email) {
    return rpc("krnshare_admin_deactivate_user", { p_email: email });
  }
  async function ksAdminReactivateUser(email) {
    return rpc("krnshare_admin_reactivate_user", { p_email: email });
  }
  async function ksAdminDeleteUserByEmail(email) {
    return rpc("krnshare_admin_delete_user_by_email", { p_email: email });
  }
  async function ksAdminForceLogout(email) {
    return rpc("krnshare_admin_force_logout", { p_email: email });
  }
  async function ksAdminListFailedExpenses(limit = 100) {
    return await rpc("krnshare_admin_list_failed_expenses", { p_limit: limit }) || [];
  }
  async function ksAdminListAnnouncements() {
    return await rpc("krnshare_admin_list_announcements") || [];
  }
  async function ksAdminCreateAnnouncement(message) {
    return rpc("krnshare_admin_create_announcement", { p_message: message });
  }
  async function ksAdminSetAnnouncementActive(id, active) {
    return rpc("krnshare_admin_set_announcement_active", { p_id: id, p_active: active });
  }

  return { adminDownloadCsv, ksAdminGetScannerSettings, ksAdminSetScannerGlobal,
    ksAdminSetScannerAccessMode, ksAdminListScannerUsers, ksAdminSetScannerUserAccess,
    ksAdminListScannerAuditLog, ksAdminOverviewStats, ksAdminDeactivateUser,
    ksAdminReactivateUser, ksAdminDeleteUserByEmail, ksAdminForceLogout,
    ksAdminListFailedExpenses, ksAdminListAnnouncements, ksAdminCreateAnnouncement,
    ksAdminSetAnnouncementActive };
}
