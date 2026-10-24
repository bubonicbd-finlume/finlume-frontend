export async function confirmTagRegistration(tags, { readSettings, saveSettings, setSettings }) {
  const before = await readSettings();
  const existing = before.tags || [];
  const missing = tags.filter(tag => !existing.includes(tag));
  if (!missing.length) { setSettings(before); return; }
  const next = { ...before, tags: [...new Set([...existing, ...missing])] };
  if (await saveSettings(next)) { setSettings(next); return; }
  let after;
  try { after = await readSettings(); }
  catch { throw new Error("The tag list save could not be confirmed. Reconnect and review Settings before retrying."); }
  setSettings(after);
  if (tags.every(tag => (after.tags || []).includes(tag))) return;
  throw new Error("The transaction tags were saved, but the account tag list was not confirmed. Review Settings and retry here.");
}
