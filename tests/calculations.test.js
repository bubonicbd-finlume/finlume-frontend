import test from "node:test";
import assert from "node:assert/strict";
import { requiredPayment, effectivePayment, payoffProjection } from "../src/features/liabilities/calculations.js";
import { contributionPlan } from "../src/features/goals/calculations.js";
import { estimatedTax } from "../src/features/tax/calculations.js";
import { addDays, nextMonthlyDueDate, currentMonthSummary, findBudgetWarnings } from "../src/features/dashboard/calculations.js";
import { averageCompletedMonthIncome, buildBudgetRows, categorySpendForMonth, envelopeSummary } from "../src/features/budgets/calculations.js";
import { detectAmountAnomalies, detectCandidates, monthlyEquivalent, nextOccurrence } from "../src/features/recurring/calculations.js";
import { averageMonthlyIncome, cashFlowForecast, expenseForecast, nextScheduledDate } from "../src/features/financial-review/calculations.js";
import { allocationDrift, combinedNetWorth, concentrationChecks, investmentSummary, maturityInfo } from "../src/features/wealth/calculations.js";
import { financialSummary, monthlyInsight, periodBounds } from "../src/features/transactions/calculations.js";

test("liability payment clears a zero-interest balance by its end date", () => {
  const account = { balance: 12000, interestRate: 0, endDate: "2027-10-17" };
  assert.equal(requiredPayment(account, "2026-10-17"), 1000);
  assert.equal(effectivePayment(account, "2026-10-17"), 1000);
});

test("liability payoff detects a payment below monthly interest", () => {
  const result = payoffProjection({ balance: 100000, interestRate: 24 }, 1000, "2026-10-17");
  assert.equal(result.neverPaysOff, true);
});

test("goal contribution plan reports full monthly coverage", () => {
  const result = contributionPlan({ target: 120000, dueDate: "2027-10-17", plannedMonthly: 10000 }, 0, "2026-10-17");
  assert.equal(result.months, 12);
  assert.equal(result.coverage, 1);
  assert.equal(result.status, "Plan reaches target");
});

test("tax calculation applies rebate and cess in the correct order", () => {
  const slabs = [{ upTo: 400000, rate: 0 }, { upTo: 800000, rate: 5 }, { upTo: 1200000, rate: 10 }, { upTo: null, rate: 30 }];
  const rebated = estimatedTax(1200000, slabs, { rebateLimit: 1200000, rebateMax: 60000, cessPct: 4 });
  assert.equal(rebated.tax, 0);
  const taxed = estimatedTax(1300000, slabs, { rebateLimit: 1200000, rebateMax: 60000, cessPct: 4 });
  assert.equal(taxed.tax, 93600);
});

test("dashboard date calculations preserve calendar dates", () => {
  assert.equal(addDays("2026-01-31", 30), "2026-03-02");
  assert.equal(nextMonthlyDueDate(31, "2027-02-10"), "2027-02-28");
  assert.equal(nextMonthlyDueDate(31, "2027-02-28"), "2027-02-28");
  assert.equal(nextMonthlyDueDate(31, "2027-03-01"), "2027-03-31");
});

test("dashboard month summary handles refunds and budget thresholds", () => {
  const transactions = [
    { date: "2026-10-01", type: "income", amount: 100000, category: "Salary" },
    { date: "2026-10-03", type: "expense", amount: 9000, category: "Food" },
    { date: "2026-10-04", type: "expense", amount: 1000, category: "Food", refund: true },
    { date: "2026-09-30", type: "expense", amount: 50000, category: "Food" }
  ];
  const summary = currentMonthSummary(transactions, "2026-10-17", { isRefund: transaction => transaction.refund === true });
  assert.equal(summary.income, 100000);
  assert.equal(summary.spending, 8000);
  assert.equal(summary.recordedMargin, 92000);
  assert.equal(findBudgetWarnings([{ category: "Food", limit: 10000 }], summary.spentByCategory).length, 1);
});

test("budget spending excludes transfers and nets refunds", () => {
  const transactions = [
    { date: "2026-10-02", type: "expense", amount: 5000, category: "Food" },
    { date: "2026-10-03", type: "expense", amount: 750, category: "Food", refund: true },
    { date: "2026-10-04", type: "expense", amount: 9000, category: "Food", transfer: true },
    { date: "2026-09-30", type: "expense", amount: 1000, category: "Food" }
  ];
  const spending = categorySpendForMonth(transactions, "2026-10", {
    isSelfTransfer: transaction => transaction.transfer === true,
    isRefund: transaction => transaction.refund === true
  });
  assert.equal(spending.get("Food"), 4250);
});

test("budget rollover keeps legacy settings compatible", () => {
  const budgets = [
    { id: "legacy", category: "Food", limit: 10000, rollover: true },
    { id: "full", category: "Travel", limit: 5000, rolloverMode: "full" }
  ];
  const rows = buildBudgetRows(budgets, new Map([["Food", 3000]]), new Map([["Food", 7000], ["Travel", 8000]]), 50);
  assert.equal(rows[0].rolloverMode, "unused");
  assert.equal(rows[0].effectiveLimit, 13000);
  assert.equal(rows[1].rolloverAmount, -3000);
  assert.equal(rows[1].effectiveLimit, 2000);
});

test("budget plan uses completed-month income and active commitments", () => {
  const transactions = [
    { date: "2026-09-01", type: "income", amount: 90000 },
    { date: "2026-08-01", type: "income", amount: 110000 },
    { date: "2026-07-01", type: "income", amount: 100000 },
    { date: "2026-10-01", type: "income", amount: 500000 }
  ];
  const suggestedIncome = averageCompletedMonthIncome(transactions, "2026-10-17");
  assert.equal(suggestedIncome, 100000);
  const summary = envelopeSummary({
    budgets: [{ limit: 30000 }],
    recurring: [{ amount: 12000, cadence: "monthly", active: true }],
    subscriptions: [{ amount: 1000, cadence: "monthly", active: false }],
    plannedIncome: 0,
    suggestedIncome,
    monthlyEquivalent: value => value
  });
  assert.deepEqual(summary, { plannedIncome: 100000, budgetTotal: 30000, recurringTotal: 12000, unallocated: 58000 });
});

test("recurring costs normalize different cadences", () => {
  assert.equal(monthlyEquivalent(1200, "annual"), 100);
  assert.equal(monthlyEquivalent(300, "quarterly"), 100);
  assert.equal(monthlyEquivalent(100, "weekly"), 5200 / 12);
  assert.equal(nextOccurrence("2026-01-31", "monthly", 31, "2026-02-01"), "2026-02-28");
});

test("recurring detection finds a consistent monthly subscription", () => {
  const transactions = [
    { id: "1", date: "2026-07-15", type: "expense", amount: 499, merchant: "Netflix", category: "Subscriptions" },
    { id: "2", date: "2026-08-15", type: "expense", amount: 499, merchant: "Netflix", category: "Subscriptions" },
    { id: "3", date: "2026-09-15", type: "expense", amount: 499, merchant: "Netflix", category: "Subscriptions" }
  ];
  const candidates = detectCandidates(transactions, [], { today: "2026-10-01" });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].cadence, "monthly");
  assert.equal(candidates[0].nextDate, "2026-10-15");
  assert.equal(candidates[0].isSubscription, true);
});

test("recurring audit identifies a meaningful charge increase", () => {
  const transactions = [
    { id: "latest", date: "2026-10-01", type: "expense", amount: 1500, merchant: "Cloud Gym" },
    { id: "old-2", date: "2026-09-01", type: "expense", amount: 1000, merchant: "Cloud Gym" },
    { id: "old-1", date: "2026-08-01", type: "expense", amount: 1000, merchant: "Cloud Gym" }
  ];
  const flags = detectAmountAnomalies(transactions, { recurring: [], subscriptions: [{ id: "gym", name: "Cloud Gym", active: true }], dismissedAnomalies: [] });
  assert.equal(flags.length, 1);
  assert.equal(flags[0].type, "amount_anomaly");
});

test("financial review schedules preserve due dates at month end", () => {
  assert.equal(nextScheduledDate("2027-01-31", "monthly"), "2027-02-28");
  assert.equal(nextScheduledDate("2026-02-28", "annual"), "2027-02-28");
  assert.equal(nextScheduledDate("2026-10-01", "biweekly"), "2026-10-15");
});

test("financial review estimates income and avoids double-counting recurring expenses", () => {
  const transactions = [
    { date: "2026-09-01", type: "income", amount: 90000, merchant: "Employer" },
    { date: "2026-08-01", type: "income", amount: 110000, merchant: "Employer" },
    { date: "2026-09-05", type: "expense", amount: 10000, merchant: "Home Rent", category: "Housing" },
    { date: "2026-09-06", type: "expense", amount: 5000, merchant: "Market", category: "Groceries" },
    { date: "2026-08-06", type: "expense", amount: 3000, merchant: "Market", category: "Groceries" }
  ];
  const settings = { recurring: [{ name: "Home Rent", amount: 10000, cadence: "monthly", active: true }], subscriptions: [] };
  assert.equal(averageMonthlyIncome(transactions, "2026-10-17"), 100000);
  const expenses = expenseForecast(transactions, settings, "2026-10-17", { monthlyEquivalent });
  assert.equal(expenses.recurringTotal, 10000);
  assert.equal(expenses.otherAvg, 4000);
});

test("cash-flow forecast applies scheduled payments within the selected range", () => {
  const settings = { recurring: [{ name: "Rent", amount: 10000, cadence: "monthly", nextDate: "2026-10-20", active: true }], subscriptions: [] };
  const result = cashFlowForecast(settings, [], 50000, 10, "2026-10-17", { monthlyEquivalent });
  assert.equal(result.events.length, 1);
  assert.equal(result.totalScheduled, 10000);
  assert.equal(result.ending, 40000);
  assert.equal(result.minBalance, 40000);
});

test("wealth summary combines accounts, holdings and savings without double counting", () => {
  const settings = {
    netWorthAccounts: [{ type: "asset", balance: 50000 }, { type: "liability", balance: 20000 }],
    investments: [{ currentValue: 30000, costBasis: 25000, dividends: 1000, assetClass: "Equity" }],
    savingsInstruments: [{ principal: 10000, status: "Active", institution: "Bank" }]
  };
  const result = combinedNetWorth(settings, "2026-10-17");
  assert.deepEqual(result, { assets: 90000, liabilities: 20000, net: 70000, investmentsValue: 30000, savingsValue: 10000, accountAssets: 50000 });
  assert.equal(investmentSummary(settings.investments).totalReturn, 6000);
});

test("wealth maturity and concentration warnings cover important risks", () => {
  assert.deepEqual(maturityInfo({ maturityDate: "2026-10-17", status: "Active" }, "2026-10-17"), { label: "Matures today", tone: "orange", days: 0 });
  const result = concentrationChecks([
    { name: "Fund A", currentValue: 70000, assetClass: "Equity" },
    { name: "Fund B", currentValue: 30000, assetClass: "Debt/Bonds" }
  ]);
  assert.equal(result.checks.some(check => check.title === "Single-holding concentration"), true);
  assert.equal(result.checks.some(check => check.title === "Limited diversification"), true);
});

test("wealth allocation drift compares current values with saved targets", () => {
  const rows = allocationDrift(
    [{ currentValue: 75000, assetClass: "Equity" }, { currentValue: 25000, assetClass: "Debt/Bonds" }],
    { Equity: 60, "Debt/Bonds": 40 },
    ["Equity", "Debt/Bonds", "Gold"]
  );
  assert.equal(rows[0].actual, 75);
  assert.equal(rows[0].drift, 15);
  assert.equal(rows[1].drift, -15);
});

test("transaction periods use complete calendar-month boundaries", () => {
  assert.deepEqual(periodBounds("last-month", "2026-03-15"), { start: "2026-02-01", end: "2026-02-28" });
  assert.deepEqual(periodBounds("custom:2024-02:2024-02", "2026-03-15"), { start: "2024-02-01", end: "2024-02-29" });
  assert.deepEqual(periodBounds("this-year", "2026-03-15"), { start: "2026-01-01", end: "2026-12-31" });
});

test("transaction summary consistently handles transfers and refunds", () => {
  const transactions = [
    { date: "2026-10-01", type: "income", amount: 100000, category: "Income" },
    { date: "2026-10-02", type: "expense", amount: 10000, category: "Food" },
    { date: "2026-10-03", type: "income", amount: 1000, category: "Food", refund: true },
    { date: "2026-10-04", type: "expense", amount: 50000, category: "Transfer", transfer: true },
    { date: "2026-09-30", type: "expense", amount: 5000, category: "Food" }
  ];
  const result = financialSummary(transactions, "this-month", "2026-10-17", {
    isSelfTransfer: transaction => transaction.transfer === true,
    isRefund: transaction => transaction.refund === true
  });
  assert.equal(result.income, 100000);
  assert.equal(result.spending, 9000);
  assert.equal(result.byCategory.get("Food"), 9000);
  assert.equal(result.transfersExcluded, 1);
  assert.equal(result.refundsApplied, 1);
});

test("monthly insight compares the last two completed months", () => {
  const transactions = [
    { id: "sep", date: "2026-09-04", type: "expense", amount: 12000, category: "Food", merchant: "Market" },
    { id: "aug", date: "2026-08-04", type: "expense", amount: 8000, category: "Food", merchant: "Market" }
  ];
  const result = monthlyInsight(transactions, "2026-10-17");
  assert.equal(result.cur.spending, 12000);
  assert.equal(result.prev.spending, 8000);
  assert.equal(result.spendDelta, 4000);
  assert.equal(result.topMovers[0].category, "Food");
  assert.equal(result.biggest.id, "sep");
});
