const PRIVATE_KEYS = new Set(["vaultConfig", "auditHistory", "notifiedDates", "notifiedBudgetOverages", "notifiedAnomalies", "notifiedSubscriptionFlags", "password", "secret", "token", "receipt", "ocrText", "rawText", "notes", "content"]);
const MAX_EVENTS = 200;
const MAX_CHANGES = 30;
const PRIVATE_FIELD = /password|secret|token|vault|receipt|ocr|raw.?text|notes?|content|signed.?url|storage.?path|file.?name|access.?key|refresh.?key|api.?key|private.?key|credential|email|phone|iban|routing|account.?number|tax.?id|ssn|address/i;

function isPrivateField(key) { return PRIVATE_FIELD.test(String(key || "")); }
function safeLabel(value, fallback, limit = 160) { return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback; }

function safeValue(value) {
  if (value == null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return { count: value.length };
  return { kind: "object" };
}

function sanitizeChange(change) {
  if (!change || typeof change !== "object" || isPrivateField(change.field)) return null;
  const next = { ...change, from: safeValue(change.from), to: safeValue(change.to) };
  if (change.collection && typeof change.collection === "object") {
    next.collection = {
      beforeCount: change.collection.beforeCount,
      afterCount: change.collection.afterCount,
      count: change.collection.count,
      ids: Array.isArray(change.collection.ids) ? change.collection.ids.slice(0, MAX_CHANGES) : undefined,
      addedIds: Array.isArray(change.collection.addedIds) ? change.collection.addedIds.slice(0, MAX_CHANGES) : [],
      removedIds: Array.isArray(change.collection.removedIds) ? change.collection.removedIds.slice(0, MAX_CHANGES) : [],
      updated: Array.isArray(change.collection.updated) ? change.collection.updated.slice(0, MAX_CHANGES).map(item => ({
        id: item.id,
        changes: (item.changes || []).map(sanitizeChange).filter(Boolean)
      })) : []
    };
  }
  return next;
}

function sanitizeEvent(event) {
  return {
    id: safeLabel(String(event.id || ""), "audit-event", 200),
    at: event.at,
    actor: safeLabel(event.actor, "Account owner", 120),
    source: safeLabel(event.source, "saved change", 120),
    ...(typeof event.entity === "string" && event.entity ? { entity: event.entity.slice(0, 160) } : {}),
    changes: (Array.isArray(event.changes) ? event.changes : []).map(sanitizeChange).filter(Boolean)
  };
}

function describeArray(before, after) {
  const oldIds = new Set(before.map(item => item?.id).filter(Boolean));
  const newIds = new Set(after.map(item => item?.id).filter(Boolean));
  const oldById = new Map(before.filter(item => item?.id).map(item => [item.id, item]));
  const updated = after.filter(item => item?.id && oldById.has(item.id) && JSON.stringify(item) !== JSON.stringify(oldById.get(item.id))).slice(0, MAX_CHANGES).map(item => {
    const original = oldById.get(item.id);
    return { id: item.id, changes: Object.keys(item).filter(key => !PRIVATE_KEYS.has(key) && !isPrivateField(key) && JSON.stringify(item[key] ?? null) !== JSON.stringify(original[key] ?? null)).slice(0, 10).map(key => ({ field: key, from: safeValue(original[key]), to: safeValue(item[key]) })) };
  });
  return { beforeCount: before.length, afterCount: after.length, addedIds: [...newIds].filter(id => !oldIds.has(id)).slice(0, MAX_CHANGES), removedIds: [...oldIds].filter(id => !newIds.has(id)).slice(0, MAX_CHANGES), updated };
}

export function settingsChanges(before = {}, after = {}) {
  const changes = [];
  for (const key of Object.keys(after)) {
    if (PRIVATE_KEYS.has(key) || isPrivateField(key) || JSON.stringify(before[key] ?? null) === JSON.stringify(after[key] ?? null)) continue;
    changes.push({ field: key, from: safeValue(before[key]), to: safeValue(after[key]), ...(Array.isArray(before[key]) && Array.isArray(after[key]) ? { collection: describeArray(before[key], after[key]) } : {}) });
    if (changes.length >= MAX_CHANGES) break;
  }
  return changes;
}

export function withSettingsAudit(before, after, { at, actor = "Account owner", source = "settings save" } = {}) {
  const changes = settingsChanges(before, after);
  if (!changes.length) return { ...after, auditHistory: Array.isArray(before?.auditHistory) ? before.auditHistory : [] };
  const event = { id: `settings:${at || new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`, at: at || new Date().toISOString(), actor, source, changes };
  return { ...after, auditHistory: [event, ...(Array.isArray(before?.auditHistory) ? before.auditHistory : [])].slice(0, MAX_EVENTS) };
}

export function auditCombinedFields(beforeSettings, fields, source = "combined save", beforeRecords = {}) {
  if (!fields || !Object.prototype.hasOwnProperty.call(fields, "settings")) return fields;
  let settings = withSettingsAudit(beforeSettings || {}, fields.settings || {}, { source });
  for (const field of ["transactions", "documents"]) {
    if (Object.prototype.hasOwnProperty.call(fields, field)) settings = withRecordCollectionAudit(settings, beforeRecords[field], fields[field], field);
  }
  return { ...fields, settings };
}

export function withTransactionLifecycleAudit(settings, transactions, action, at = new Date().toISOString()) {
  const rows = Array.isArray(transactions) ? transactions : [];
  if (!rows.length) return settings;
  const event = {
    id: `transactions:${action}:${at}:${Math.random().toString(36).slice(2, 8)}`,
    at,
    actor: "Account owner",
    source: action === "restore" ? "transaction restore" : "transaction deletion",
    changes: [{ field: "transactions", from: action === "restore" ? 0 : rows.length, to: action === "restore" ? rows.length : 0, collection: { ids: rows.slice(0, MAX_CHANGES).map(row => row.id).filter(Boolean), count: rows.length } }]
  };
  return { ...settings, auditHistory: [event, ...(Array.isArray(settings?.auditHistory) ? settings.auditHistory : [])].slice(0, MAX_EVENTS) };
}

export function withRecordCollectionAudit(settings, before, after, field, at = new Date().toISOString()) {
  if (!["transactions", "documents"].includes(field)) return settings;
  const oldRows = Array.isArray(before) ? before : [];
  const newRows = Array.isArray(after) ? after : [];
  const collection = describeArray(oldRows, newRows);
  if (!collection.addedIds.length && !collection.removedIds.length && !collection.updated.length && oldRows.length === newRows.length) return settings;
  const event = {
    id: `${field}:${at}:${Math.random().toString(36).slice(2, 8)}`,
    at,
    actor: "Account owner",
    source: `${field} save`,
    changes: [{ field, from: oldRows.length, to: newRows.length, collection }]
  };
  return { ...settings, auditHistory: [event, ...(Array.isArray(settings?.auditHistory) ? settings.auditHistory : [])].slice(0, MAX_EVENTS) };
}

export function financialAuditFeed(transactions = [], settings = {}, serverEvents = []) {
  const transactionEvents = (Array.isArray(transactions) ? transactions : []).flatMap(item => {
    const created = item?.createdAt ? [{ id: `transaction:${item.id}:created`, at: item.createdAt, actor: "Account owner", source: item.source || "manual entry", entity: item.merchant || item.id, changes: [{ field: "created", from: null, to: item.amount }] }] : [];
    const changes = (Array.isArray(item?.changeHistory) ? item.changeHistory : []).map((event, index) => sanitizeEvent({ id: `transaction:${item.id}:${index}`, at: event.at, actor: event.actor || "Account owner", source: event.source || "transaction edit", entity: item.merchant || item.id, changes: event.changes || [] }));
    return [...created, ...changes];
  });
  return [...transactionEvents, ...(Array.isArray(settings?.auditHistory) ? settings.auditHistory : []), ...(Array.isArray(serverEvents) ? serverEvents : [])].filter(item => item?.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 200).map(sanitizeEvent);
}

export function mapServerAuditRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map(row => ({
    id: `server-audit:${row.id}`,
    at: row.event_at,
    actor: row.actor_user_id ? "Account owner" : "System operation",
    source: `Database ${String(row.operation || "change").toLowerCase()}`,
    entity: "Finance records",
    changes: [
      ...(Array.isArray(row.changed_fields) ? row.changed_fields : []).map(field => ({ field, from: null, to: "changed" })),
      ...(row.transaction_count_before != null || row.transaction_count_after != null ? [{ field: "Transaction record count", from: row.transaction_count_before, to: row.transaction_count_after }] : []),
      ...(row.document_count_before != null || row.document_count_after != null ? [{ field: "Document record count", from: row.document_count_before, to: row.document_count_after }] : [])
    ]
  }));
}

export function auditExportJson(events, exportedAt = new Date().toISOString()) {
  return JSON.stringify({ format: "finlume-audit-v1", exportedAt, events: (Array.isArray(events) ? events : []).map(sanitizeEvent) }, null, 2);
}
