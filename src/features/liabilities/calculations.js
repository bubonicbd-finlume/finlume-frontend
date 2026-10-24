function parseDateOnly(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function monthsRemaining(endDate, today) {
  if (!endDate) return null;
  const end = parseDateOnly(endDate);
  const start = parseDateOnly(today);
  if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) return null;
  return Math.max(1, Math.ceil((end - start) / 2629800000));
}

export function requiredPayment(account, today) {
  const balance = Math.max(0, Number(account?.balance) || 0);
  const months = monthsRemaining(account?.endDate, today);
  if (!balance || !months) return 0;
  const monthlyRate = Math.max(0, Number(account?.interestRate) || 0) / 1200;
  if (!monthlyRate) return balance / months;
  const denominator = 1 - Math.pow(1 + monthlyRate, -months);
  return denominator > 0 ? balance * monthlyRate / denominator : balance;
}

export function effectivePayment(account, today) {
  const balance = Math.max(0, Number(account?.balance) || 0);
  const entered = Math.max(0, Number(account?.minPayment) || 0);
  const required = requiredPayment(account, today);
  const fallback = Math.max(1, Math.round(balance * 0.02));
  return Math.max(entered, required, required || entered ? 0 : fallback);
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
