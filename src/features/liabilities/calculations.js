import { fromMinor, safeMinor } from "../../platform/money.js";

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? date : null;
}

export function monthsRemaining(endDate, today) {
  if (!endDate) return null;
  const end = parseDateOnly(endDate);
  const start = parseDateOnly(today);
  if (!end || !start) return null;
  const wholeMonths = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  return Math.max(1, wholeMonths + (end.getUTCDate() > start.getUTCDate() ? 1 : 0));
}

export function requiredPayment(account, today) {
  const balance = Math.max(0, Number(account?.balance) || 0);
  const months = monthsRemaining(account?.endDate, today) || (Number.isInteger(Number(account?.outstandingPayments)) && Number(account?.outstandingPayments) > 0 ? Number(account.outstandingPayments) : null);
  if (!balance || !months) return 0;
  const monthlyRate = Math.max(0, Number(account?.interestRate) || 0) / 1200;
  if (!monthlyRate) return balance / months;
  const denominator = 1 - Math.pow(1 + monthlyRate, -months);
  return denominator > 0 ? balance * monthlyRate / denominator : balance;
}

export function effectivePayment(account, today) {
  const balance = Math.max(0, Number(account?.balance) || 0);
  if (!balance) return 0;
  const enteredRaw = Math.max(0, Number(account?.minPayment) || 0);
  const entered = enteredRaw * ({ weekly: 52 / 12, fortnightly: 26 / 12, quarterly: 1 / 3, monthly: 1 }[account?.repaymentFrequency] || 1);
  const required = requiredPayment(account, today);
  const fallback = Math.max(1, Math.round(balance * 0.02));
  return entered || required || fallback;
}

export function payoffProjection(account, paymentOverride, today) {
  let balance = Math.max(0, Number(account?.balance) || 0);
  let months = 0;
  let totalInterest = 0;
  const rate = Math.max(0, Number(account?.interestRate) || 0) / 1200;
  const payment = Math.max(0, Number(paymentOverride) || effectivePayment(account, today));
  while (balance > 0.01 && months < 1200) {
    const interest = balance * rate;
    if (payment <= interest && balance > payment) return { months, totalInterest, neverPaysOff: true };
    totalInterest += interest;
    balance = Math.max(0, balance + interest - payment);
    months++;
  }
  return { months, totalInterest, neverPaysOff: balance > 0.01 };
}

// Planning schedule only: monthly compounding at annual rate / 12, payments at
// month end, and all amounts rounded to minor currency units at each payment.
// Lender statements may differ because of daily accrual, fees, or rate changes.
export function amortizationSchedule(account, today, { payment, extraPayment = 0, oneTimePayments = {}, rateChanges = {}, maxMonths = 1200 } = {}) {
  let balance = Math.max(0, safeMinor(account?.balance));
  const basePayment = Math.max(0, safeMinor(payment ?? effectivePayment(account, today)));
  const extra = Math.max(0, safeMinor(extraPayment));
  const rows = [];
  let totalInterest = 0;
  for (let month = 1; balance > 0 && month <= maxMonths; month++) {
    const annualRate = Number(rateChanges[month] ?? account?.interestRate ?? 0);
    if (!Number.isFinite(annualRate) || annualRate < 0) return { rows, totalInterest: fromMinor(totalInterest), neverPaysOff: true, reason: "Invalid interest rate" };
    const interest = Math.round(balance * annualRate / 1200);
    const oneTime = Math.max(0, safeMinor(oneTimePayments[month]));
    const due = Math.min(balance + interest, basePayment + extra + oneTime);
    if (due <= interest && balance > 0) return { rows, totalInterest: fromMinor(totalInterest), neverPaysOff: true, reason: "Payment does not cover interest" };
    const principal = Math.min(balance, due - interest);
    balance -= principal;
    totalInterest += interest;
    rows.push({ month, payment: fromMinor(due), principal: fromMinor(principal), interest: fromMinor(interest), balance: fromMinor(balance) });
  }
  return { rows, totalInterest: fromMinor(totalInterest), neverPaysOff: balance > 0, months: rows.length, remainingBalance: fromMinor(balance) };
}

