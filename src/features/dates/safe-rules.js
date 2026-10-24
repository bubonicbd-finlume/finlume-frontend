const supportedRecurrences = new Set(["once", "monthly", "quarterly", "annually"]);

export function prepareDateRules(value, validDate) {
  if (!Array.isArray(value)) return { rules: [], invalidCount: value == null ? 0 : 1 };
  const candidates = value.filter(rule => rule && typeof rule === "object"
    && ((typeof rule.id === "string" && rule.id.trim()) || (typeof rule.id === "number" && Number.isFinite(rule.id)))
    && typeof rule.name === "string"
    && (rule.category == null || typeof rule.category === "string")
    && (rule.account == null || typeof rule.account === "string")
    && (rule.notes == null || typeof rule.notes === "string")
    && validDate(rule.dueDate)
    && (!rule.recurrence || supportedRecurrences.has(rule.recurrence))
    && (!rule.endDate || (validDate(rule.endDate) && rule.endDate >= rule.dueDate))
    && (!rule.deletedAt || typeof rule.deletedAt === "string"));
  const counts = new Map();
  for (const rule of value) {
    if (!rule || typeof rule !== "object" || rule.id == null) continue;
    const id = String(rule.id);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const rules = candidates.filter(rule => counts.get(String(rule.id)) === 1);
  return { rules, invalidCount: value.length - rules.length };
}

export function expiredDateCleanup(rules, today, validDate, daysBetween, purgeDays) {
  if (!Array.isArray(rules)) return null;
  const kept = rules.filter(rule => !rule || typeof rule.deletedAt !== "string"
    || !validDate(rule.deletedAt.slice(0, 10))
    || daysBetween(rule.deletedAt.slice(0, 10), today) <= purgeDays);
  return kept.length === rules.length ? null : kept;
}
