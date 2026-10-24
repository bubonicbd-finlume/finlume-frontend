function same(a, b) { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }

export function reviewUndoEntries(rows, confirmedIds, kind, value) {
  const confirmed = new Set(confirmedIds);
  return rows.filter(row => confirmed.has(row.id)).map(row => ({
    id: row.id,
    before: kind === "category" ? { category: row.category, subcategory: row.subcategory } : kind === "account" ? { account: row.account } : { tags: row.tags || [] },
    after: kind === "category" ? { category: value, subcategory: undefined } : kind === "account" ? { account: value } : { tags: [...new Set([...(row.tags || []), value])] }
  }));
}

export async function undoReviewEntries(entries, transactions, save) {
  const remaining = [];
  let undone = 0;
  for (const entry of entries) {
    const current = transactions.find(row => row.id === entry.id);
    if (!current || Object.entries(entry.after).some(([key, value]) => !same(current[key], value))) {
      remaining.push(entry);
      continue;
    }
    try { await save(entry.id, entry.before); undone++; }
    catch { remaining.push(entry); }
  }
  return { undone, remaining };
}
