import { fromMinor, safeMinor, sumMoney, toMinor } from "../platform/money.js";

export { fromMinor, safeMinor, sumMoney, toMinor };

export function moneyAdd(...values) { return fromMinor(values.reduce((total, value) => total + safeMinor(value), 0)); }
export function moneySubtract(value, ...values) { return fromMinor(values.reduce((total, item) => total - safeMinor(item), safeMinor(value))); }
export function moneyMultiply(value, multiplier) {
  const factor = Number(multiplier); if (!Number.isFinite(factor)) throw new Error("Invalid multiplier");
  return fromMinor(Math.round(safeMinor(value) * factor));
}
export function percentage(part, whole, fallback = null) { const a = Number(part), b = Number(whole); return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b * 100 : fallback; }
export function annualRateToPeriodic(annualPercent, periodsPerYear = 12) { const rate = Number(annualPercent), periods = Number(periodsPerYear); return Number.isFinite(rate) && rate >= 0 && Number.isFinite(periods) && periods > 0 ? rate / 100 / periods : null; }
export function inflationAdjusted(value, annualPercent, years) { const rate = Number(annualPercent), term = Number(years); return Number.isFinite(rate) && rate >= 0 && Number.isFinite(term) && term >= 0 ? moneyMultiply(value, Math.pow(1 + rate / 100, term)) : null; }
export function financialRatio(numerator, denominator) { const value = percentage(numerator, denominator); return value == null ? null : value / 100; }

export function uniqueTransactions(transactions = []) {
  const ids = new Set(), fingerprints = new Set(), rows = [];
  for (const item of transactions) {
    if (!item || typeof item !== "object") continue;
    const id = item.id ? String(item.id) : "";
    const fingerprint = [item.date, item.type, safeMinor(item.amount), String(item.account || "").trim().toLowerCase(), String(item.merchant || "").trim().toLowerCase()].join("|");
    if ((id && ids.has(id)) || fingerprints.has(fingerprint)) continue;
    if (id) ids.add(id); fingerprints.add(fingerprint); rows.push(item);
  }
  return rows;
}

export function cashFlowSummary(transactions = [], { excludeTransfers = true } = {}) {
  let income = 0, expenses = 0;
  for (const item of uniqueTransactions(transactions)) {
    if (excludeTransfers && (item.tags || []).includes("Transfer")) continue;
    if (item.type === "income") income += safeMinor(item.amount);
    else if (item.type === "expense") expenses += safeMinor(item.amount);
  }
  return { income: fromMinor(income), expenses: fromMinor(expenses), net: fromMinor(income - expenses), savingsRate: income > 0 ? (income - expenses) / income * 100 : null };
}

export const FINANCIAL_ENGINE_ASSUMPTIONS = Object.freeze({ money: "Amounts are rounded to two minor-currency digits at calculation boundaries.", rates: "Annual percentage rates are nominal unless a calculation explicitly documents compounding.", dates: "Calendar dates use YYYY-MM-DD strings and are not converted through local timestamps.", duplicates: "Transactions with the same ID or date/type/amount/account/merchant fingerprint are counted once." });
