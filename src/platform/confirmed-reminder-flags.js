export async function confirmReminderFlags(keys, { readSettings, saveSettings, setSettings }) {
  if (!keys.length) return;
  const before = await readSettings();
  if (before.notifiedDates != null && !Array.isArray(before.notifiedDates)) {
    throw new Error("Saved reminder flags have an unsupported format. No changes were made.");
  }
  const current = before.notifiedDates || [];
  const nextFlags = [...new Set([...current, ...keys])].slice(-300);
  if (keys.every(key => current.includes(key))) { setSettings(before); return; }
  const next = { ...before, notifiedDates: nextFlags };
  if (await saveSettings(next)) { setSettings(next); return; }
  let after;
  try { after = await readSettings(); }
  catch { throw new Error("Reminder tracking could not be confirmed. Reconnect and review notifications before retrying."); }
  setSettings(after);
  if (Array.isArray(after.notifiedDates) && keys.every(key => after.notifiedDates.includes(key))) return;
  throw new Error("Reminder tracking was not confirmed. Review notifications and retry.");
}
