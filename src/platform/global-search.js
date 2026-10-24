const LIMIT = 6;

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const hasId = value => (typeof value.id === "string" && value.id.length > 0) || typeof value.id === "number";
const matches = (value, query) => typeof value === "string" && value.toLowerCase().includes(query);

export function computeGlobalSearchResults(query, sources = {}) {
  const q = typeof query === "string" ? query.trim().toLowerCase() : "";
  const empty = { transactions: [], documents: [], investments: [] };
  if (q.length < 2) return empty;
  const transactions = Array.isArray(sources.transactions) ? sources.transactions : [];
  const documents = Array.isArray(sources.documents) ? sources.documents : [];
  const investments = Array.isArray(sources.investments) ? sources.investments : [];

  return {
    transactions: transactions.filter(row => isRecord(row) && hasId(row) &&
      typeof row.merchant === "string" && typeof row.category === "string" &&
      typeof row.date === "string" && Number.isFinite(row.amount) &&
      (matches(row.merchant, q) || matches(row.category, q) ||
        (Array.isArray(row.tags) && row.tags.some(tag => matches(tag, q)))))
      .sort((a, b) => a.date < b.date ? 1 : -1).slice(0, LIMIT),
    documents: documents.filter(row => isRecord(row) && hasId(row) && matches(row.filename, q)).slice(0, LIMIT),
    investments: investments.filter(row => isRecord(row) && hasId(row) &&
      typeof row.name === "string" && Number.isFinite(row.currentValue) &&
      (matches(row.name, q) || matches(row.assetClass, q) || matches(row.purpose, q)))
      .slice(0, LIMIT),
  };
}
