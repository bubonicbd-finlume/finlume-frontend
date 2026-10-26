import test from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, monthDays, shiftMonth } from "../src/features/timeline/calculations.js";

test("timeline clamps loan due dates and keeps calendar navigation in bounds", () => {
  assert.equal(monthDays("2026-02").length, 28);
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  const result = buildTimeline({ month: "2026-02", today: "2026-02-01", settings: { netWorthAccounts: [{ id: "loan", name: "Loan", type: "liability", balance: 100, paymentDueDay: 31 }] }, liabilityPayment: () => 20 });
  assert.equal(result.events[0].date, "2026-02-28");
  assert.equal(result.outgoing, 20);
});

test("timeline counts matching saved obligations once and excludes recorded dates", () => {
  const result = buildTimeline({ month: "2026-10", today: "2026-10-22", transactions: [{ id: "paid" }], settings: { recurring: [{ id: "r", name: "Rent", nextDate: "2026-10-25", amount: 100 }], monthlyPlanIncome: 500, goals: [{ id: "g", name: "Holiday", plannedMonthly: 50 }] }, dateInstances: [{ key: "d", name: "Rent", dueDate: "2026-10-25", amount: 100 }, { key: "done", name: "Paid bill", dueDate: "2026-10-20", amount: 30, txId: "paid", paid: true }] });
  assert.equal(result.outgoing, 150);
  assert.equal(result.expectedIncome, 500);
  assert.equal(result.events.find(item => item.id === "date:done").status, "recorded");
  assert.equal(result.events.filter(item => item.name === "Rent" && item.counted).length, 1);
});

test("monthly income plan does not double count dated expected income", () => {
  const result = buildTimeline({ month: "2026-10", today: "2026-10-01", settings: { monthlyPlanIncome: 1000, recurring: [{ id: "salary", name: "Salary", type: "income", nextDate: "2026-10-28", amount: 1000 }] } });
  assert.equal(result.expectedIncome, 1000);
  assert.equal(result.events.find(item => item.id === "income:2026-10").counted, false);
});

test("timeline includes recorded transactions separately from projections", () => {
  const result = buildTimeline({ month: "2026-10", today: "2026-10-23", transactions: [
    { id: "expense", date: "2026-10-22", merchant: "Grocer", amount: 25, type: "expense", category: "Groceries" },
    { id: "income", date: "2026-10-23", merchant: "Salary", amount: 100, type: "income" },
    { id: "outside", date: "2026-09-30", amount: 50, type: "expense" }
  ], settings: { recurring: [{ id: "rent", name: "Rent", amount: 40, nextDate: "2026-10-28" }] } });
  assert.equal(result.transactionCount, 2);
  assert.equal(result.recordedOutgoing, 25);
  assert.equal(result.recordedIncome, 100);
  assert.equal(result.outgoing, 40);
  assert.equal(result.events.find(event => event.id === "transaction:expense").tab, "transactions");
});

test("recorded income does not erase the income plan and refunds net spending", () => {
  const result = buildTimeline({ month: "2026-10", today: "2026-10-23", transactions: [
    { id: "salary", date: "2026-10-20", type: "income", amount: 100 },
    { id: "expense", date: "2026-10-21", type: "expense", amount: 40 },
    { id: "refund", date: "2026-10-22", type: "income", amount: 10, tags: ["Refund"] },
    { id: "transfer", date: "2026-10-22", type: "expense", amount: 500, tags: ["Transfer"] }
  ], settings: { monthlyPlanIncome: 1000 } });
  assert.equal(result.recordedIncome, 100);
  assert.equal(result.recordedOutgoing, 30);
  assert.equal(result.expectedIncome, 1000);
  assert.equal(result.transactionCount, 4);
  assert.equal(result.events.find(event => event.id === "transaction:transfer").status, "transfer");
  assert.deepEqual(result.spendingCategories, [{ category: "Uncategorized", amount: 30 }]);
});

test("timeline ranks net spending categories and ignores transfers", () => {
  const result = buildTimeline({ month: "2026-10", today: "2026-10-24", transactions: [
    { id: "food", date: "2026-10-20", amount: 30, type: "expense", category: "Groceries" },
    { id: "refund", date: "2026-10-21", amount: 10, type: "income", category: "Groceries", tags: ["Refund"] },
    { id: "rent", date: "2026-10-22", amount: 100, type: "expense", category: "Housing" },
    { id: "transfer", date: "2026-10-22", amount: 500, type: "expense", category: "Housing", tags: ["Transfer"] }
  ] });
  assert.deepEqual(result.spendingCategories, [{ category: "Housing", amount: 100 }, { category: "Groceries", amount: 20 }]);
});

test("timeline expands custom recurring dates and marks a matched payment recorded", () => {
  const result = buildTimeline({ month: "2026-10", today: "2026-10-25", transactions: [{ id: "rent-21", date: "2026-10-21", merchant: "Rent", type: "expense", amount: 100 }], settings: { recurring: [{ id: "rent", name: "Rent", amount: 100, nextDate: "2026-10-11", cadence: "custom", intervalDays: 10 }], subscriptions: [] } });
  const scheduled = result.events.filter(event => event.id.startsWith("Recurring:"));
  assert.deepEqual(scheduled.map(event => event.date), ["2026-10-11", "2026-10-21", "2026-10-31"]);
  assert.equal(scheduled[1].status, "recorded");
  assert.equal(result.outgoing, 200);
});

test("timeline shows skipped recurring occurrences without counting them", () => {
  const result = buildTimeline({
    month: "2026-10",
    today: "2026-10-25",
    transactions: [],
    settings: { recurring: [{ id: "rent", name: "Rent", amount: 100, type: "expense", cadence: "monthly", nextDate: "2026-11-25", skippedOccurrences: ["2026-10-25"], active: true }], subscriptions: [], netWorthAccounts: [], goals: [] }
  });
  const skipped = result.events.find(event => event.status === "skipped");
  assert.equal(skipped.date, "2026-10-25");
  assert.equal(skipped.counted, false);
  assert.equal(result.outgoing, 0);
});

test("timeline includes subscription trial boundaries", () => {
  const result = buildTimeline({
    month: "2026-10",
    today: "2026-10-20",
    transactions: [],
    settings: { recurring: [], subscriptions: [{ id: "trial", name: "Music", amount: 99, cadence: "monthly", nextDate: "2026-11-01", trialEndDate: "2026-10-28", active: true }], netWorthAccounts: [], goals: [] }
  });
  const event = result.events.find(item => item.id.startsWith("trial:"));
  assert.equal(event.status, "upcoming");
  assert.equal(event.counted, false);
  assert.equal(event.tab, "recurring");
});

test("timeline includes liability maturity, investment and savings contributions with targets", () => {
  const result = buildTimeline({ month: "2026-10", today: "2026-10-10", settings: {
    netWorthAccounts: [{ id: "loan", name: "Car loan", type: "liability", category: "Vehicle Loan", balance: 1000, paymentDueDay: 15, endDate: "2026-10-31" }],
    investments: [{ id: "fund", name: "Index fund", monthlyContribution: 200 }], savingsInstruments: [{ id: "rd", name: "Recurring deposit", monthlyContribution: 100 }]
  }, liabilityPayment: () => 50 });
  assert.ok(result.events.some(event => event.id.startsWith("maturity:loan") && event.entityId === "loan"));
  assert.ok(result.events.some(event => event.id.startsWith("investment:fund") && event.amount === 200));
  assert.ok(result.events.some(event => event.id.startsWith("savings:rd") && event.amount === 100));
});
