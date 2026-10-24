const PREFIX = "finlume_split_pending_recurring_v1";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function storageKey(userId, groupId) {
  return `${PREFIX}:${userId}:${groupId}`;
}

function readMarkers(storage, key) {
  if (!storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(key) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, due]) => id && typeof due === "string" && DATE.test(due)));
  } catch {
    return {};
  }
}

function writeMarkers(storage, key, markers) {
  if (!storage) return false;
  try {
    if (Object.keys(markers).length) storage.setItem(key, JSON.stringify(markers));
    else storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function rememberPendingRecurring(storage, userId, groupId, ruleId, sourceDue) {
  if (!ruleId || !DATE.test(sourceDue || "")) return false;
  const key = storageKey(userId, groupId);
  return writeMarkers(storage, key, { ...readMarkers(storage, key), [ruleId]: sourceDue });
}

export function clearPendingRecurring(storage, userId, groupId, ruleId) {
  const key = storageKey(userId, groupId);
  const markers = readMarkers(storage, key);
  delete markers[ruleId];
  return writeMarkers(storage, key, markers);
}

export function reconcilePendingRecurring(storage, userId, groupId, rules) {
  const key = storageKey(userId, groupId);
  const markers = readMarkers(storage, key);
  const current = {};
  for (const rule of rules) {
    if (markers[rule.id] === rule.nextDue) current[rule.id] = rule.nextDue;
  }
  if (Object.keys(current).length !== Object.keys(markers).length) writeMarkers(storage, key, current);
  return current;
}
