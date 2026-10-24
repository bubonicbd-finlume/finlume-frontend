export const IMPORT_HISTORY_LIMIT = 20;

export function normalizeImportHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item.id === "string" && item.id && typeof item.at === "string")
    .slice(0, IMPORT_HISTORY_LIMIT).map(item => ({
      id: item.id,
      at: item.at,
      source: String(item.source || "statement").slice(0, 40),
      account: String(item.account || "").slice(0, 100),
      sourceRows: Math.max(0, Number(item.sourceRows) || 0),
      inserted: Math.max(0, Number(item.inserted) || 0),
      duplicates: Math.max(0, Number(item.duplicates) || 0),
      invalid: Math.max(0, Number(item.invalid) || 0),
      unconfirmed: Math.max(0, Number(item.unconfirmed) || 0),
      duplicateRows: Array.isArray(item.duplicateRows) ? item.duplicateRows.slice(0, 20).map(row => ({
        date: String(row.date || "").slice(0, 40), merchant: String(row.merchant || "").slice(0, 100), amount: String(row.amount ?? "").slice(0, 40), account: String(row.account || "").slice(0, 100),
      })) : [],
      invalidRows: Array.isArray(item.invalidRows) ? item.invalidRows.slice(0, 20).map(row => ({
        date: String(row.date || "").slice(0, 40), merchant: String(row.merchant || "").slice(0, 100), amount: String(row.amount ?? "").slice(0, 40), reason: String(row.reason || "Invalid row").slice(0, 120), type: row.type === "income" ? "income" : "expense",
      })) : [],
      reversedAt: typeof item.reversedAt === "string" ? item.reversedAt : undefined,
    }));
}

export function prependImportHistory(history, entry) {
  return normalizeImportHistory([entry, ...normalizeImportHistory(history).filter(item => item.id !== entry.id)]);
}

export function importSessionRows(transactions, id) {
  return transactions.filter(row => row.importSessionId === id);
}
