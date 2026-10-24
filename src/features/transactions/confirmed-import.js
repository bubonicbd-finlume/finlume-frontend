export async function confirmStatementImport(rows, { readTransactions, prepare, saveTransactions, setTransactions }) {
  // Read the account again before preparing a whole-array update. This also makes
  // a retry safe when the previous response was lost after the cloud committed it.
  const before = await readTransactions();
  const { next, result, ids } = prepare(rows, before);
  if (ids.length === 0) {
    setTransactions(before);
    return result;
  }

  if (await saveTransactions(next)) {
    setTransactions(next);
    return result;
  }

  let after;
  try {
    after = await readTransactions();
  } catch {
    throw new Error("The import result could not be confirmed. Reconnect and try again; FinLume will check your saved transactions before importing.");
  }
  setTransactions(after);
  if (ids.every(id => after.some(transaction => transaction.id === id))) return result;
  throw new Error("The import was not fully confirmed. Try again; rows already saved will be detected as duplicates.");
}
