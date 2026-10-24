export async function applyReviewBatch(rows, patchFor, save) {
  const confirmed = [];
  const unfinished = [];
  for (const row of rows) {
    try {
      await save(row.id, patchFor(row));
      confirmed.push(row.id);
    } catch (error) {
      unfinished.push({ id: row.id, error: error?.message || "Write not confirmed" });
    }
  }
  return { confirmed, unfinished };
}

export function mergeReviewBatchResult(previous, current) {
  return {
    confirmed: [...new Set([...(previous?.confirmed || []), ...current.confirmed])],
    unfinished: current.unfinished,
  };
}
