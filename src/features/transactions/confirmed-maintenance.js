export async function confirmTransactionMaintenance(makeChange, {
  readTransactions, saveTransactions, setTransactions,
}) {
  const before = await readTransactions();
  const result = makeChange(before);
  const { next, count } = result;
  if (!Array.isArray(next) || next.length !== before.length || !Number.isInteger(count) || count < 0) {
    throw new Error("The transaction update could not be prepared.");
  }
  if (!count) { setTransactions(before); return result; }
  const expected = new Map(next.filter((row, index) => JSON.stringify(row) !== JSON.stringify(before[index]))
    .map(row => [row.id, row]));
  let saved = false;
  try { saved = await saveTransactions(next); } catch { /* Check the cloud value below. */ }
  if (saved) { setTransactions(next); return result; }
  let after;
  try { after = await readTransactions(); }
  catch { throw new Error("The update result could not be confirmed. Reconnect and review Transactions before retrying."); }
  setTransactions(after);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if ([...expected].every(([id, row]) => same(after.find(item => item.id === id), row))) return result;
  throw new Error("The transaction updates were not confirmed. Review Transactions and retry.");
}
