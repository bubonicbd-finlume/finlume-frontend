import { nextScheduledDate } from "../financial-review/calculations.js";
import { safeMinor } from "../../platform/money.js";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
  return value;
}
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

export function prepareRecurringPostRow(row, { kind, scheduleId, occurrence, prepareTransaction, normalizeMerchant = value => String(value || "").trim().toLowerCase() }) {
  const field = kind === "subscription" ? "subscriptions" : kind === "recurring" ? "recurring" : null;
  if (!field || !Array.isArray(row?.settings?.[field]) || !Array.isArray(row?.transactions)) throw new Error("Saved schedules or transactions have an unsupported format.");
  const matches = row.settings[field].filter(item => item?.id === scheduleId);
  if (matches.length !== 1) throw new Error("This schedule changed or has a duplicate ID. Review it before posting.");
  const item = matches[0];
  if (item.lastPostedDate === occurrence) {
    if (!row.transactions.some(transaction => transaction.id === item.lastPostedTransactionId)) throw new Error("This occurrence is marked posted but its linked transaction is missing. Review both records before retrying.");
    return { transactions: row.transactions, settings: row.settings };
  }
  if (item.active === false || item.nextDate !== occurrence || !/^\d{4}-\d{2}-\d{2}$/.test(occurrence || "") || (item.startDate && occurrence < item.startDate) || (item.endDate && occurrence > item.endDate)) throw new Error("This occurrence is no longer due. Review the schedule before posting.");
  const amount = safeMinor(item.amount);
  if (amount <= 0) throw new Error("The scheduled amount must be greater than zero.");
  if (item.cadence === "custom" && !(Number.isInteger(Number(item.intervalDays)) && Number(item.intervalDays) > 0)) throw new Error("The custom interval needs a positive whole number of days.");
  const type = item.type === "income" ? "income" : "expense";
  const account = item.account || row.settings.accounts?.[0] || "Imported account";
  const merchant = item.name || "Scheduled entry";
  const targetName = normalizeMerchant(item.linkMerchant || merchant);
  const existing = row.transactions.filter(transaction => transaction.date === occurrence && transaction.type === type && safeMinor(transaction.amount) === amount && transaction.account === account && normalizeMerchant(transaction.merchant) === targetName);
  if (existing.length > 1) throw new Error("Multiple matching transactions exist. Review Transactions before linking this occurrence.");
  const id = `recurring:${kind}:${scheduleId}:${occurrence}`;
  const sameId = row.transactions.find(transaction => transaction.id === id);
  if (sameId && !existing.some(transaction => transaction.id === id)) throw new Error("The occurrence ID already belongs to another transaction.");
  let transactions = row.transactions;
  const transactionId = existing[0]?.id || id;
  if (!existing.length) {
    const raw = { id, date: occurrence, merchant, category: item.category || (type === "income" ? "Income" : "Needs review"), amount: item.amount, type, account, tags: ["Recurring"], source: "recurring" };
    transactions = prepareTransaction(raw, row.transactions, row.settings);
    if (!Array.isArray(transactions) || transactions.filter(transaction => transaction.id === id).length !== 1) throw new Error("The scheduled transaction could not be prepared.");
  }
  const nextDate = nextScheduledDate(occurrence, item.cadence, item.intervalDays, item.anchorDay);
  const completed = Boolean(item.endDate && nextDate > item.endDate);
  const settings = { ...row.settings, [field]: row.settings[field].map(schedule => schedule.id === scheduleId ? { ...schedule, nextDate, lastPostedDate: occurrence, lastPostedTransactionId: transactionId, ...(completed ? { active: false, status: "completed" } : {}) } : schedule) };
  return { transactions, settings };
}

export async function confirmRecurringPost(options) {
  const before = await options.readRow();
  const next = prepareRecurringPostRow(before, options);
  if (same(before.transactions, next.transactions) && same(before.settings, next.settings)) { options.onConfirmed(before); return; }
  try { await options.writeRow(next, before.updated_at ?? null); }
  catch (error) {
    let after;
    try { after = await options.readRow(); }
    catch { throw new Error("The posting result is uncertain. Reconnect and review the schedule and Transactions before retrying.", { cause: error }); }
    if (!same(after.transactions, next.transactions) || !same(after.settings, next.settings)) throw new Error("The occurrence was not confirmed. Review the schedule and retry.", { cause: error });
    options.onConfirmed(after);
    return;
  }
  options.onConfirmed({ ...before, ...next });
}

export function prepareRecurringSkipRow(row, { kind, scheduleId, occurrence }) {
  const field = kind === "subscription" ? "subscriptions" : kind === "recurring" ? "recurring" : null;
  if (!field || !Array.isArray(row?.settings?.[field])) throw new Error("Saved schedules have an unsupported format.");
  const matches = row.settings[field].filter(item => item?.id === scheduleId);
  if (matches.length !== 1) throw new Error("This schedule changed or has a duplicate ID. Review it before skipping.");
  const item = matches[0];
  if (item.active === false || item.nextDate !== occurrence || !/^\d{4}-\d{2}-\d{2}$/.test(occurrence || "") || (item.startDate && occurrence < item.startDate) || (item.endDate && occurrence > item.endDate)) throw new Error("This occurrence is no longer due. Review the schedule before skipping.");
  const skipped = Array.isArray(item.skippedOccurrences) ? item.skippedOccurrences : [];
  if (skipped.includes(occurrence)) return { transactions: row.transactions, settings: row.settings };
  const nextDate = nextScheduledDate(occurrence, item.cadence, item.intervalDays, item.anchorDay);
  const completed = Boolean(item.endDate && nextDate > item.endDate);
  const settings = { ...row.settings, [field]: row.settings[field].map(schedule => schedule.id === scheduleId ? { ...schedule, nextDate, skippedOccurrences: [...skipped, occurrence].slice(-120), ...(completed ? { active: false, status: "completed" } : {}) } : schedule) };
  return { transactions: row.transactions, settings };
}

export async function confirmRecurringSkip(options) {
  const before = await options.readRow();
  const next = prepareRecurringSkipRow(before, options);
  if (same(before.settings, next.settings)) { options.onConfirmed(before); return; }
  try { await options.writeRow(next, before.updated_at ?? null); }
  catch (error) {
    let after;
    try { after = await options.readRow(); }
    catch { throw new Error("The skip result is uncertain. Reconnect and review the schedule before retrying.", { cause: error }); }
    if (!same(after.settings, next.settings)) throw new Error("The skipped occurrence was not confirmed. Review the schedule and retry.", { cause: error });
    options.onConfirmed(after);
    return;
  }
  options.onConfirmed({ ...before, ...next });
}
