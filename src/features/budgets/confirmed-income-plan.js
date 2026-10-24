export async function confirmMonthlyPlanIncome(beforeIncome, nextIncome, { readSettings, saveSettings, setSettings }) {
  const before = await readSettings();
  const stored = Number(before.monthlyPlanIncome || 0);
  if (stored === nextIncome) { setSettings(before); return; }
  if (stored !== Number(beforeIncome || 0)) {
    setSettings(before);
    throw new Error("Expected income changed elsewhere. Review the current money plan before trying again.");
  }
  const next = { ...before, monthlyPlanIncome: nextIncome };
  if (await saveSettings(next)) { setSettings(next); return; }
  let after;
  try { after = await readSettings(); }
  catch { throw new Error("The income plan could not be confirmed. Reconnect and review Budgets before retrying."); }
  setSettings(after);
  if (Number(after.monthlyPlanIncome || 0) === nextIncome) return;
  throw new Error("The income plan was not confirmed. Review Budgets and retry.");
}
