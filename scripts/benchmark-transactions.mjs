import { performance } from "node:perf_hooks";
import { filterTransactionRows } from "../src/features/transactions/discovery-filters.js";

const settings = { selectedPeriod: "all-time" };
const filters = { search: "coffee", account: "all", category: "all", tag: "all", source: "all", importSession: "all", expenseOnly: false, reviewOnly: false, flaggedOnly: false, dateFrom: "", dateTo: "", amountMin: "", amountMax: "", sortBy: "date-desc" };
function fixture(size) {
  return Array.from({ length: size }, (_, index) => ({ id: `synthetic-${index}`, date: `2026-10-${String(index % 28 + 1).padStart(2, "0")}`, merchant: index % 5 ? `Shop ${index}` : `Coffee ${index}`, amount: index % 400 + 1, type: "expense", category: index % 3 ? "Groceries" : "Needs review", account: "Checking", tags: [] }));
}
function previousFilter(rows) {
  return rows.filter(row => true)
    .filter(row => filters.account === "all" || row.account === filters.account)
    .filter(row => filters.category === "all" || row.category === filters.category)
    .filter(row => filters.tag === "all" || row.tags.includes(filters.tag))
    .filter(row => filters.source === "all" || (row.source || "manual") === filters.source)
    .filter(row => !filters.expenseOnly || row.type === "expense")
    .filter(row => !filters.reviewOnly || row.category === "Needs review")
    .filter(row => !filters.dateFrom || row.date >= filters.dateFrom)
    .filter(row => !filters.dateTo || row.date <= filters.dateTo)
    .filter(row => !filters.search || row.merchant.toLowerCase().includes(filters.search))
    .sort((a, b) => b.date.localeCompare(a.date));
}
function runSamples(rows, fn) {
  for (let warmup = 0; warmup < 3; warmup++) fn(rows);
  const samples = [];
  for (let run = 0; run < 10; run++) {
    const start = performance.now();
    const matches = fn(rows);
    samples.push(performance.now() - start);
    if (matches.length !== rows.length / 5) throw new Error("Synthetic filter count changed.");
  }
  samples.sort((a, b) => a - b);
  return Number(((samples[4] + samples[5]) / 2).toFixed(2));
}
function measure(size) {
  const rows = fixture(size);
  const priorMs = runSamples(rows, previousFilter);
  const currentMs = runSamples(rows, input => filterTransactionRows(input, settings, filters, { inPeriod: () => true, flaggedIds: new Set() }));
  return { records: size, matches: size / 5, previousMedianMs: priorMs, currentMedianMs: currentMs };
}
console.table([measure(1000), measure(10000)]);
