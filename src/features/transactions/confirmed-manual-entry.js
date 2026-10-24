function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function sameEntry(actual, expected) {
  if (!actual || !expected) return false;
  const { createdAt: _actualTime, ...actualFields } = actual;
  const { createdAt: _expectedTime, ...expectedFields } = expected;
  return JSON.stringify(canonical(actualFields)) === JSON.stringify(canonical(expectedFields));
}

export async function confirmManualEntry(entry, { readTransactions, prepare, saveTransactions, setTransactions }) {
  const before = await readTransactions();
  const already = before.find(row => row.id === entry.id);
  const base = already ? before.filter(row => row.id !== entry.id) : before;
  const { next, ids } = prepare(entry, base);
  const expected = next.find(row => row.id === entry.id);
  if (ids.length !== 1 || !expected) throw new Error("This entry could not be prepared. Review its details and try again.");
  if (already) {
    setTransactions(before);
    if (sameEntry(already, expected)) return;
    throw new Error("An entry with these details was already saved. Review Transactions before trying again.");
  }
  if (await saveTransactions(next)) { setTransactions(next); return; }

  let after;
  try { after = await readTransactions(); }
  catch { throw new Error("The entry save could not be confirmed. Reconnect and review Transactions before retrying."); }
  setTransactions(after);
  const saved = after.find(row => row.id === entry.id);
  if (sameEntry(saved, expected)) return;
  throw new Error("The entry was not confirmed as saved. Review Transactions and try again.");
}
