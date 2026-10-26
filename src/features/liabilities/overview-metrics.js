import { amortizationSchedule, effectivePayment } from "./calculations.js";
import { averageMonthlyIncome } from "../financial-review/calculations.js";
import { fromMinor, safeMinor } from "../../platform/money.js";

function addMonths(value, count) {
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + count, 1));
  target.setUTCDate(Math.min(day, new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()));
  return target.toISOString().slice(0, 10);
}

export function liabilityOverviewMetrics(accounts, transactions, today, options = {}) {
  const active = (accounts || []).filter(account => account.type === "liability" && Number(account.balance) > 0);
  const monthlyPayment = fromMinor(active.reduce((sum, account) => sum + safeMinor(effectivePayment(account, today)), 0));
  const income = averageMonthlyIncome(transactions, today, options);
  const schedules = active.map(account => amortizationSchedule(account, today));
  const canEstimatePayoff = active.length > 0 && active.every(account => account.interestRate !== undefined && account.interestRate !== null && account.interestRate !== "" && Number.isFinite(Number(account.interestRate))) && schedules.every(schedule => !schedule.neverPaysOff);
  const remainingInterest = canEstimatePayoff ? fromMinor(schedules.reduce((sum, schedule) => sum + safeMinor(schedule.totalInterest), 0)) : null;
  const debtFreeDate = canEstimatePayoff ? addMonths(today, Math.max(...schedules.map(schedule => schedule.months))) : null;
  const categoryMinor = new Map();
  for (const account of active) categoryMinor.set(account.category || "Other", (categoryMinor.get(account.category || "Other") || 0) + safeMinor(account.balance));
  const categories = [...categoryMinor].map(([name, value]) => ({ name, value: fromMinor(value) })).sort((a, b) => b.value - a.value);
  return { activeCount: active.length, monthlyPayment, income, paymentToIncomePct: income > 0 ? monthlyPayment / income * 100 : null, remainingInterest, debtFreeDate, categories };
}
