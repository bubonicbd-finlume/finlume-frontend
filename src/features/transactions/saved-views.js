const LIMIT = 5;
const FIELDS = ["search", "account", "category", "tag", "source", "importSession", "reviewOnly", "flaggedOnly", "expenseOnly", "dateFrom", "dateTo", "amountMin", "amountMax", "sortBy"];

export function normalizeView(input) {
  const name = String(input?.name || "").trim().slice(0, 40);
  if (!name) throw new Error("Give this view a name.");
  const filters = {};
  for (const field of FIELDS) {
    const value = input?.filters?.[field];
    filters[field] = typeof value === "boolean" ? value : typeof value === "string" ? value.slice(0, 200) : "";
  }
  return { name, filters };
}

export function normalizeSavedViews(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, LIMIT).flatMap(item => { try { return [normalizeView(item)]; } catch { return []; } });
}

export function upsertSavedView(existing, input) {
  const view = normalizeView(input);
  return [view, ...normalizeSavedViews(existing).filter(item => item.name.toLowerCase() !== view.name.toLowerCase())].slice(0, LIMIT);
}

export function withoutSavedView(existing, name) {
  return normalizeSavedViews(existing).filter(item => item.name !== name);
}

export function readSavedViews(storage, accountKey) {
  try {
    const parsed = JSON.parse(storage.getItem(`finlume-transaction-views:${accountKey}`) || "[]");
    if (!Array.isArray(parsed)) return [];
    return normalizeSavedViews(parsed);
  } catch { return []; }
}

export function saveView(storage, accountKey, existing, input) {
  const view = normalizeView(input);
  const next = [view, ...existing.filter(item => item.name.toLowerCase() !== view.name.toLowerCase())].slice(0, LIMIT);
  storage.setItem(`finlume-transaction-views:${accountKey}`, JSON.stringify(next));
  return next;
}

export function removeView(storage, accountKey, existing, name) {
  const next = existing.filter(item => item.name !== name);
  storage.setItem(`finlume-transaction-views:${accountKey}`, JSON.stringify(next));
  return next;
}
