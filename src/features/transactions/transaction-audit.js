const TRACKED = ["merchant", "date", "amount", "type", "category", "subcategory", "account", "tags", "notes", "paymentMethod", "incomeSource", "goalId"];
const LIMIT = 20;
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function withTransactionAudit(original, patch, at, source = "manual edit", batchId = null) {
  const changes = TRACKED.filter(field => Object.prototype.hasOwnProperty.call(patch, field) &&
    !same(original[field], patch[field])).map(field => ({ field, from: original[field] ?? null, to: patch[field] ?? null }));
  if (!changes.length) return patch;
  return { ...patch, changeHistory: [
    { at, source, ...(batchId ? { batchId } : {}), changes },
    ...(Array.isArray(original.changeHistory) ? original.changeHistory : []),
  ].slice(0, LIMIT) };
}

export function transactionOrigin(row) {
  if (row.importSessionId) return `Imported ${row.source || "statement"} · session ${row.importSessionId.slice(0, 8)}`;
  if (row.source && row.source !== "manual") return `Added from ${row.source}`;
  return "Added manually";
}
