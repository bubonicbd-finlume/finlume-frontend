import test from "node:test";
import assert from "node:assert/strict";
import { filterReportTransactions, financialIntelligenceReport, intelligenceReportCsv, transactionReportSummary } from "../src/features/reports/financial-intelligence.js";

test("financial intelligence report covers all requested domains", () => {
  const report = financialIntelligenceReport([{ date: "2026-09-01", type: "income", amount: 1000 }, { date: "2026-09-02", type: "expense", amount: 600 }], {
    netWorthAccounts: [{ type: "asset", category: "Cash & Bank", balance: 5000 }, { type: "liability", balance: 2000, minPayment: 100 }], netWorthHistory: [{ month: "2026-08", netWorth: 2500 }, { month: "2026-09", netWorth: 3000 }], goals: [{ target: 1000, current: 250 }], investments: [{ currentValue: 800, costBasis: 700 }], subscriptions: [{ active: true, amount: 20 }]
  });
  assert.equal(report.debt.balance, 2000); assert.equal(report.netWorth.change, 500); assert.equal(report.goals.percent, 25); assert.equal(report.portfolio.value, 800); assert.equal(report.subscriptions.active, 1); assert.match(intelligenceReportCsv(report), /Net worth/);
});

test("report filters combine date, account and category and export budget actuals", () => {
  const transactions = [
    { date: "2026-01-01", account: "A", category: "Food", type: "expense", amount: 20 },
    { date: "2026-02-01", account: "B", category: "Food", type: "expense", amount: 30 },
    { date: "2026-02-02", account: "B", category: "Income", type: "income", amount: 100 }
  ];
  const rows = filterReportTransactions(transactions, { start: "2026-02-01", end: "2026-02-28", account: "B", category: "Food" });
  assert.equal(rows.length, 1);
  const summary = transactionReportSummary(rows, { budgets: [{ category: "Food", limit: 25 }] });
  assert.equal(summary.expenses, 30);
  assert.match(intelligenceReportCsv(financialIntelligenceReport(rows, {}), summary), /Budget versus actual/);
});
