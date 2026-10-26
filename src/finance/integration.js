import { moneyAdd, moneySubtract } from "./engine.js";

function updateAccount(accounts, accountName, delta) {
  if (!accountName || !delta) return accounts || [];
  let found = false;
  const next = (accounts || []).map(account => {
    if (account.type !== "asset" || account.name !== accountName) return account;
    found = true;
    const balance = moneyAdd(account.balance, delta);
    if (balance < 0) throw new Error(`${accountName} does not have enough available cash.`);
    return { ...account, balance };
  });
  if (!found) throw new Error(`Funding account ${accountName} was not found.`);
  return next;
}

// Moving cash into a holding or goal is a balance-sheet transfer, not income or
// consumption. Editing reverses the previous allocation before applying the new one.
export function applyInvestmentFunding(accounts, previous, next) {
  let updated = accounts || [];
  if (previous?.fundingAccount) updated = updateAccount(updated, previous.fundingAccount, Math.max(0, Number(previous.costBasis) || 0));
  if (next?.fundingAccount) updated = updateAccount(updated, next.fundingAccount, -Math.max(0, Number(next.costBasis) || 0));
  return updated;
}

export function applyGoalAllocation({ accounts = [], goals = [] }, { goalId, fundingAccount, amount, allocationId, date }) {
  const value = Math.max(0, Number(amount) || 0);
  if (!value || !goalId || !allocationId) throw new Error("Goal, amount and allocation ID are required.");
  if (goals.some(goal => (goal.allocations || []).some(item => item.id === allocationId))) return { accounts, goals };
  const nextAccounts = updateAccount(accounts, fundingAccount, -value);
  let found = false;
  const nextGoals = goals.map(goal => {
    if (goal.id !== goalId) return goal;
    found = true;
    return { ...goal, current: moneyAdd(goal.current, value), allocations: [...(goal.allocations || []), { id: allocationId, date, amount: value, fundingAccount }] };
  });
  if (!found) throw new Error("Goal was not found.");
  return { accounts: nextAccounts, goals: nextGoals };
}

export function splitLoanPayment({ balance, payment, monthlyRate = 0, fees = 0 }) {
  const interest = Math.min(Math.max(0, Number(balance) || 0), Math.max(0, Number(balance) || 0) * Math.max(0, Number(monthlyRate) || 0));
  const principal = Math.max(0, Math.min(Number(balance) || 0, moneySubtract(payment, interest, fees)));
  return { principal, interest, fees: Math.max(0, Number(fees) || 0), nextBalance: moneySubtract(balance, principal) };
}
