export async function confirmTransactionDelete(ids, { readTransactions, saveTransactions, setTransactions }) {
  const wanted = new Set(ids);
  const before = await readTransactions();
  const removed = before.filter(row => wanted.has(row.id));
  if (!removed.length) { setTransactions(before); return []; }
  const next = before.filter(row => !wanted.has(row.id));
  if (await saveTransactions(next)) { setTransactions(next); return removed; }
  let after;
  try { after = await readTransactions(); }
  catch { throw new Error("The delete result could not be confirmed. Reconnect and review Transactions before retrying."); }
  setTransactions(after);
  if (removed.every(row => !after.some(saved => saved.id === row.id))) return removed;
  throw new Error("The transaction delete was not confirmed. Review Transactions and try again.");
}

export async function confirmTransactionUndo(removed, { readTransactions, saveTransactions, setTransactions }) {
  const before = await readTransactions();
  const missing = removed.filter(row => !before.some(saved => saved.id === row.id));
  if (!missing.length) { setTransactions(before); return; }
  const next = [...missing, ...before];
  if (await saveTransactions(next)) { setTransactions(next); return; }
  let after;
  try { after = await readTransactions(); }
  catch { throw new Error("The Undo result could not be confirmed. Reconnect and review Transactions."); }
  setTransactions(after);
  if (missing.every(row => after.some(saved => saved.id === row.id))) return;
  throw new Error("Undo was not confirmed. Review Transactions and try again.");
}
