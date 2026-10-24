export function matchesDiscoveryFilters(transaction, { tag = "all", source = "all", importSession = "all" } = {}) {
  return (tag === "all" || (transaction.tags || []).includes(tag)) &&
    (source === "all" || (transaction.source || "manual") === source) &&
    (importSession === "all" || transaction.importSessionId === importSession);
}

export function discoverySources(transactions) {
  return [...new Set(transactions.map(row => row.source || "manual"))].sort();
}

export function importSessions(transactions) {
  return [...new Set(transactions.map(row => row.importSessionId).filter(Boolean))].sort().reverse();
}

export function activeDiscoveryFilters({ search, account, category, tag, source, importSession = "all", expenseOnly, reviewOnly, flaggedOnly, dateFrom, dateTo, amountMin, amountMax }) {
  return [
    search?.trim() && `Search: ${search.trim()}`,
    account !== "all" && `Account: ${account}`,
    category !== "all" && `Category: ${category}`,
    tag !== "all" && `Tag: ${tag}`,
    source !== "all" && `Source: ${source}`,
    importSession !== "all" && `Import: ${importSession}`,
    expenseOnly && "Expenses only",
    reviewOnly && "Needs review",
    flaggedOnly && "Flagged",
    dateFrom && `From: ${dateFrom}`,
    dateTo && `To: ${dateTo}`,
    amountMin !== "" && `Minimum: ${amountMin}`,
    amountMax !== "" && `Maximum: ${amountMax}`,
  ].filter(Boolean);
}

export function filterTransactionRows(transactions, settings, filters, { inPeriod, flaggedIds }) {
  const query = String(filters.search || "").trim().toLowerCase();
  const minimum = filters.amountMin === "" ? null : parseFloat(filters.amountMin);
  const maximum = filters.amountMax === "" ? null : parseFloat(filters.amountMax);
  const result = [];
  for (const row of transactions) {
    if (!inPeriod(row, settings.selectedPeriod) ||
      (filters.account !== "all" && row.account !== filters.account) ||
      (filters.category !== "all" && row.category !== filters.category) ||
      !matchesDiscoveryFilters(row, filters) ||
      (filters.expenseOnly && row.type !== "expense") ||
      (filters.reviewOnly && row.category !== "Needs review") ||
      (filters.flaggedOnly && !flaggedIds.has(row.id)) ||
      (filters.dateFrom && row.date < filters.dateFrom) ||
      (filters.dateTo && row.date > filters.dateTo) ||
      (minimum !== null && !(row.amount >= minimum)) ||
      (maximum !== null && !(row.amount <= maximum))) continue;
    if (query && !String(row.merchant || "").toLowerCase().includes(query) &&
      !String(row.category || "").toLowerCase().includes(query) &&
      !(row.tags || []).some(tag => String(tag).toLowerCase().includes(query))) continue;
    result.push(row);
  }
  const sort = filters.sortBy;
  result.sort((a, b) => sort === "amount-asc" ? a.amount - b.amount :
    sort === "amount-desc" ? b.amount - a.amount :
    sort === "date-asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  return result;
}
