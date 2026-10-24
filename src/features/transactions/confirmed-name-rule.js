export async function confirmNameRule(text, category, id, { readSettings, saveSettings, setSettings }) {
  const normalized = text.trim().toLowerCase();
  const before = await readSettings();
  const existing = (before.nameRules || []).find(rule => rule.text?.trim().toLowerCase() === normalized);
  if (existing) {
    setSettings(before);
    if (existing.category === category) return;
    throw new Error("This name already has a different category rule. Review the saved rules before retrying.");
  }
  const rule = { id, text: text.trim(), category };
  const next = { ...before, nameRules: [rule, ...before.nameRules || []] };
  if (await saveSettings(next)) { setSettings(next); return; }
  let after;
  try { after = await readSettings(); }
  catch { throw new Error("The rule save could not be confirmed. Reconnect and review the rules before retrying."); }
  setSettings(after);
  const saved = (after.nameRules || []).find(item => item.text?.trim().toLowerCase() === normalized);
  if (saved?.category === category) return;
  throw new Error("The rule was not confirmed. Review the saved rules and try again.");
}
