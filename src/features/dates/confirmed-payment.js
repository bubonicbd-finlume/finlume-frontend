function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
  }
  return value;
}

function same(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

export function datePaymentTransactionId(ruleId, origDate) {
  return `date:${ruleId}:${origDate}`;
}

export function datePaymentTransactionCategory(dateCategory, categories) {
  const preferred = { bills: "Utilities", subscriptions: "Subscriptions", insurance: "Insurance", income: "Income" }[dateCategory];
  return preferred && Array.isArray(categories) && categories.includes(preferred) ? preferred : "Needs review";
}

export async function confirmDatePaymentSteps(recordTransaction, confirmStatus) {
  if (recordTransaction) await recordTransaction();
  try {
    await confirmStatus();
  } catch (error) {
    if (!recordTransaction) throw error;
    throw new Error("The transaction was saved, but the date status could not be confirmed. Review Dates to Remember and retry with the same details; the transaction will not be duplicated.", { cause: error });
  }
}

export async function undoDatePaymentSteps(removeTransaction, confirmStatus) {
  if (removeTransaction) await removeTransaction();
  try {
    await confirmStatus();
  } catch (error) {
    if (!removeTransaction) throw error;
    throw new Error("The linked transaction was removed, but the date status could not be confirmed. Review Dates to Remember and retry Undo; a missing transaction will not block the retry.", { cause: error });
  }
}

export async function confirmDatePaymentOverride(ruleId, origDate, patch, { readSettings, saveSettings, setSettings, patchRules }) {
  const before = await readSettings();
  if (before.datesToRemember != null && !Array.isArray(before.datesToRemember)) {
    throw new Error("Saved dates have an unsupported format. No changes were made.");
  }
  const rules = before.datesToRemember || [];
  const matching = rules.filter(item => item && item.id === ruleId);
  if (matching.length > 1) {
    setSettings(before);
    throw new Error("Multiple saved dates share this ID. No payment status was changed; review the saved dates before retrying.");
  }
  const rule = matching[0] && !matching[0].deletedAt ? matching[0] : null;
  if (!rule) {
    setSettings(before);
    throw new Error("This date changed or was removed. Review Dates to Remember before trying again.");
  }
  const next = { ...before, datesToRemember: patchRules(rules, ruleId, origDate, patch) };
  const expected = next.datesToRemember.find(item => item && item.id === ruleId);
  if (same(rule, expected)) { setSettings(before); return; }
  if (await saveSettings(next)) { setSettings(next); return; }
  let after;
  try { after = await readSettings(); }
  catch { throw new Error("The payment status could not be confirmed. Reconnect and review Dates to Remember before retrying."); }
  setSettings(after);
  const saved = (Array.isArray(after.datesToRemember) ? after.datesToRemember : []).find(item => item && item.id === ruleId);
  if (same(saved, expected)) return;
  throw new Error("The payment status was not confirmed. Review Dates to Remember and retry this action.");
}
