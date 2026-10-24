function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
  }
  return value;
}

function sameRecord(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

export async function confirmTransactionEdit(id, patch, { expectedOriginal, readTransactions, saveTransactions, setTransactions }) {
  const before = await readTransactions();
  const original = before.find(row => row.id === id);
  if (!original) {
    setTransactions(before);
    throw new Error("This transaction is no longer available. Review Transactions before editing it.");
  }
  const expected = { ...expectedOriginal, ...patch };
  if (sameRecord(original, expected)) { setTransactions(before); return; }
  if (!sameRecord(original, expectedOriginal)) {
    setTransactions(before);
    throw new Error("This transaction changed elsewhere. Review it before saving your edit.");
  }
  const next = before.map(row => row.id === id ? expected : row);
  if (await saveTransactions(next)) { setTransactions(next); return; }
  let after;
  try { after = await readTransactions(); }
  catch { throw new Error("The edit result could not be confirmed. Reconnect and review Transactions before retrying."); }
  setTransactions(after);
  if (sameRecord(after.find(row => row.id === id), expected)) return;
  throw new Error("The edit was not confirmed. Review Transactions and try again.");
}
