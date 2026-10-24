function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

export async function confirmRestoreRows({ readRows, saveRows, setRows, mode, incoming, fingerprint }) {
  const before = await readRows();
  let next;
  if (mode === "replace") {
    next = incoming;
  } else {
    const ids = new Set(before.map(row => row.id));
    const prints = fingerprint ? new Set(before.map(fingerprint)) : null;
    const added = incoming.filter(row => {
      if (ids.has(row.id) || prints?.has(fingerprint(row))) return false;
      ids.add(row.id);
      prints?.add(fingerprint(row));
      return true;
    });
    next = [...before, ...added];
  }
  if (same(before, next)) { setRows(before); return 0; }
  if (await saveRows(next)) { setRows(next); return next.length - before.length; }

  let after;
  try { after = await readRows(); }
  catch { throw new Error("The restore result could not be confirmed. Reconnect and review your data before retrying."); }
  setRows(after);
  if (same(after, next)) return next.length - before.length;
  throw new Error("The restore was not confirmed. Review your data and try again.");
}

export async function confirmRestoreSettings({ readSettings, saveSettings, setSettings, patch }) {
  const before = await readSettings();
  const next = { ...before, ...patch };
  if (same(before, next)) { setSettings(before); return; }
  if (await saveSettings(next)) { setSettings(next); return; }
  let after;
  try { after = await readSettings(); }
  catch { throw new Error("The settings restore could not be confirmed. Reconnect and review Settings before retrying."); }
  setSettings(after);
  if (Object.keys(patch).every(key => same(after[key], patch[key]))) return;
  throw new Error("The settings restore was not confirmed. Review Settings and try again.");
}

export function restoreSettingsPatch(backupSettings, { mode, withDocuments }) {
  const patch = {};
  for (const key of Object.keys(backupSettings || {})) {
    if (key === "__proto__" || key === "constructor" || key === "prototype" || key === "vaultConfig") continue;
    patch[key] = backupSettings[key];
  }
  if (mode === "replace" && withDocuments) patch.vaultConfig = backupSettings?.vaultConfig ?? null;
  return patch;
}

export function checkRestoredDocuments({ incoming, backupSettings, currentSettings, mode, withSettings }) {
  if (!incoming.some(document => document.encrypted)) return;
  const backupConfig = backupSettings?.vaultConfig;
  if (!backupConfig) throw new Error("This backup has encrypted documents without vault settings. Restore a complete backup that includes the vault configuration.");
  if (mode === "replace") {
    if (!withSettings) throw new Error("Select settings with encrypted documents so the restored vault can be unlocked.");
  } else if (!same(backupConfig, currentSettings?.vaultConfig)) {
    throw new Error("These encrypted documents use different vault settings. Use a complete replace restore with documents and settings, or leave documents unchecked.");
  }
}
