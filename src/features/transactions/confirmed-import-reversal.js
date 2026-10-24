function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort()
    .filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
  return value;
}
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export async function confirmImportReversal(sessionId, previewRows, {
  readTransactions, saveTransactions, setTransactions,
}) {
  if (!sessionId || !Array.isArray(previewRows) || !previewRows.length ||
    previewRows.some(row => !row?.id || row.importSessionId !== sessionId)) {
    throw new Error("This import has no verified transactions to reverse.");
  }
  const ids = new Set(previewRows.map(row => row.id));
  if (ids.size !== previewRows.length) throw new Error("The import preview contains duplicate records.");
  const before = await readTransactions();
  const current = before.filter(row => row.importSessionId === sessionId);
  if (current.length !== previewRows.length || current.some(row => !ids.has(row.id) ||
    !same(row, previewRows.find(preview => preview.id === row.id)))) {
    setTransactions(before);
    throw new Error("This import changed since the preview. Reopen it and review the current transactions before reversing.");
  }
  const next = before.filter(row => !ids.has(row.id));
  let saved = false;
  try { saved = await saveTransactions(next); } catch { /* Confirm against the cloud below. */ }
  if (saved) { setTransactions(next); return current.length; }
  let after;
  try { after = await readTransactions(); }
  catch { throw new Error("The reversal result could not be confirmed. Reconnect and review Transactions before retrying."); }
  setTransactions(after);
  if (current.every(row => !after.some(savedRow => savedRow.id === row.id))) return current.length;
  throw new Error("The reversal was not confirmed. Review the import before retrying.");
}
