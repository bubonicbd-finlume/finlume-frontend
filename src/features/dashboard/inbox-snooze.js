const PREFIX = "finlume:action-inbox-snoozes:v1:";
const MAX_ENTRIES = 200;

export function inboxSignature(item) {
  return JSON.stringify([item.key, item.title, item.reason, item.date || "", item.amount ?? "", item.kind]);
}

export function readInboxSnoozes(storage, userId, now = Date.now()) {
  if (!storage || !userId) return [];
  try {
    const value = JSON.parse(storage.getItem(PREFIX + userId) || "[]");
    return Array.isArray(value) ? value.filter(row => row && typeof row.signature === "string" && Number.isFinite(row.until) && row.until > now).slice(-MAX_ENTRIES) : [];
  } catch { return []; }
}

export function writeInboxSnoozes(storage, userId, rows) {
  if (!storage || !userId) return false;
  try {
    storage.setItem(PREFIX + userId, JSON.stringify(rows.slice(-MAX_ENTRIES)));
    return true;
  } catch { return false; }
}

export function snoozeInboxItem(storage, userId, rows, item, now = Date.now()) {
  const signature = inboxSignature(item);
  const next = [...rows.filter(row => row.signature !== signature && row.until > now), { signature, until: now + 86400000 }].slice(-MAX_ENTRIES);
  return writeInboxSnoozes(storage, userId, next) ? next : null;
}

export function isInboxSnoozed(rows, item, now = Date.now()) {
  return rows.some(row => row.signature === inboxSignature(item) && row.until > now);
}
