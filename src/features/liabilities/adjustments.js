import { moneyAdd } from "../../finance/engine.js";

export function applyLiabilityAdjustment(liability, amount, note, at) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value === 0) return { ...liability };
  const balance = Math.max(0, moneyAdd(liability.balance, value));
  const adjustment = { id: `adjustment-${at}-${Math.abs(value)}`, at, amount: value, note: String(note || "Manual balance adjustment").trim().slice(0, 200), balanceAfter: balance };
  return { ...liability, balance, adjustments: [...(Array.isArray(liability.adjustments) ? liability.adjustments : []), adjustment] };
}

export function orderedLiabilities(accounts, mode = "avalanche") {
  const rows = [...accounts];
  if (mode === "custom") return rows.sort((a, b) => (Number(a.customPriority) || 9999) - (Number(b.customPriority) || 9999) || String(a.name).localeCompare(String(b.name)));
  if (mode === "snowball") return rows.sort((a, b) => Number(a.balance || 0) - Number(b.balance || 0));
  return rows.sort((a, b) => Number(b.interestRate || 0) - Number(a.interestRate || 0));
}
