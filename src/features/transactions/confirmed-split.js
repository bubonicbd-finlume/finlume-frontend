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

export async function confirmTransactionSplit(originalId, children, { readTransactions, saveTransactions, setTransactions, expectedOriginal }) {
  const committed = rows => !rows.some(row => row.id === originalId) && children.every(child => {
    const saved = rows.find(row => row.id === child.id);
    return saved && sameRecord(saved, child);
  });
  const before = await readTransactions();
  const original = before.find(row => row.id === originalId);
  if (!original) {
    setTransactions(before);
    if (committed(before)) return;
    throw new Error("This transaction has changed. Review Transactions before trying the split again.");
  }
  if (expectedOriginal && !sameRecord(original, expectedOriginal)) {
    setTransactions(before);
    throw new Error("This transaction changed elsewhere. Review Transactions before splitting it.");
  }
  if (children.some(child => before.some(row => row.id === child.id))) {
    setTransactions(before);
    throw new Error("A split entry already exists. Review Transactions before trying again.");
  }
  const next = [...children, ...before.filter(row => row.id !== originalId)];
  if (await saveTransactions(next)) {
    setTransactions(next);
    return;
  }
  let after;
  try { after = await readTransactions(); }
  catch { throw new Error("The split result could not be confirmed. Reconnect and review Transactions before retrying."); }
  setTransactions(after);
  if (committed(after)) return;
  throw new Error("The split was not confirmed. Review Transactions and try again.");
}
