import { fromMinor, safeMinor } from "../../platform/money.js";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
  return value;
}
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

export function prepareLiabilityPaymentRow(row, { liabilityId, paymentId, date, account, principal, interest = 0, fees = 0, notes = "", prepareTransactions }) {
  if (!Array.isArray(row?.transactions) || !Array.isArray(row?.settings?.netWorthAccounts)) throw new Error("Saved liabilities or transactions have an unsupported format.");
  if (!liabilityId || !paymentId || !validDate(date) || !account) throw new Error("Choose a liability, payment date and funding account.");
  const matches = row.settings.netWorthAccounts.filter(item => item?.id === liabilityId && item.type === "liability");
  if (matches.length !== 1) throw new Error("This liability changed or has a duplicate ID. Review it before recording a payment.");
  const liability = matches[0];
  const principalMinor = safeMinor(principal), interestMinor = safeMinor(interest), feeMinor = safeMinor(fees), balanceMinor = safeMinor(liability.balance);
  if (principalMinor <= 0) throw new Error("Principal paid must be greater than zero.");
  if (interestMinor < 0 || feeMinor < 0) throw new Error("Interest and fees cannot be negative.");
  if (principalMinor > balanceMinor) throw new Error("Principal paid cannot exceed the outstanding balance.");
  const ids = [paymentId + ":principal", ...(interestMinor ? [paymentId + ":interest"] : []), ...(feeMinor ? [paymentId + ":fee"] : [])];
  const existingPayment = (liability.paymentHistory || []).find(item => item?.id === paymentId);
  if (existingPayment) {
    if (ids.every(id => row.transactions.some(transaction => transaction?.id === id))) return { transactions: row.transactions, settings: row.settings };
    throw new Error("This payment is saved on the liability but one or more linked transactions are missing.");
  }
  if (row.transactions.some(transaction => String(transaction?.id || "").startsWith(paymentId + ":"))) throw new Error("This payment ID already belongs to another transaction.");
  const common = { date, type: "expense", account, source: "liability-payment", liabilityId, paymentId, notes };
  const name = liability.name || "Liability";
  const entries = [
    { ...common, id: ids[0], merchant: name + " principal", category: "Transfer - Own Accounts", amount: fromMinor(principalMinor), tags: ["Transfer", "Liability principal"] },
    ...(interestMinor ? [{ ...common, id: paymentId + ":interest", merchant: name + " interest", category: "EMI", amount: fromMinor(interestMinor), tags: ["Liability interest"] }] : []),
    ...(feeMinor ? [{ ...common, id: paymentId + ":fee", merchant: name + " fee", category: "Bank Charges", amount: fromMinor(feeMinor), tags: ["Liability fee"] }] : [])
  ];
  const transactions = prepareTransactions(entries, row.transactions, row.settings);
  if (!Array.isArray(transactions) || entries.some(entry => transactions.filter(transaction => transaction?.id === entry.id).length !== 1)) throw new Error("The payment transactions could not be prepared.");
  const payment = { id: paymentId, date, account, principal: fromMinor(principalMinor), interest: fromMinor(interestMinor), fees: fromMinor(feeMinor), total: fromMinor(principalMinor + interestMinor + feeMinor), transactionIds: entries.map(entry => entry.id), notes };
  const nextLiability = { ...liability, balance: fromMinor(balanceMinor - principalMinor), paymentHistory: [payment, ...(liability.paymentHistory || [])], lastUpdated: new Date().toISOString() };
  const settings = { ...row.settings, netWorthAccounts: row.settings.netWorthAccounts.map(item => item.id === liabilityId ? nextLiability : item) };
  return { transactions, settings };
}

export async function confirmLiabilityPayment(options) {
  const before = await options.readRow();
  const next = prepareLiabilityPaymentRow(before, options);
  if (same(before.transactions, next.transactions) && same(before.settings, next.settings)) { options.onConfirmed(before); return; }
  try { await options.writeRow(next, before.updated_at ?? null); }
  catch (error) {
    let after;
    try { after = await options.readRow(); }
    catch { throw new Error("The payment result is uncertain. Reconnect and review the liability and Transactions before retrying.", { cause: error }); }
    if (!same(after.transactions, next.transactions) || !same(after.settings, next.settings)) throw new Error("The liability payment was not confirmed. Review both records and retry.", { cause: error });
    options.onConfirmed(after);
    return;
  }
  options.onConfirmed({ ...before, ...next });
}
