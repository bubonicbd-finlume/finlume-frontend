import React, { useMemo, useState } from "react";
import { filterReportTransactions, financialIntelligenceReport, intelligenceReportCsv, transactionReportSummary } from "./financial-intelligence.js";

function download(content, type, filename) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export function FinancialIntelligencePanel({ Card, formatCurrency, transactions, settings }) {
  const [filters, setFilters] = useState({ start: "", end: "", account: "", category: "", entity: "all" });
  const filtered = useMemo(() => filterReportTransactions(transactions, filters), [transactions, filters]);
  const report = useMemo(() => financialIntelligenceReport(filtered, settings), [filtered, settings]);
  const activity = useMemo(() => transactionReportSummary(filtered, settings), [filtered, settings]);
  const accounts = [...new Set(transactions.map(item => item.account).filter(Boolean))].sort();
  const categories = [...new Set(transactions.map(item => item.category).filter(Boolean))].sort();
  const allMetrics = [
    ["cashflow", "Filtered cash flow", formatCurrency(activity.cashFlow), `${formatCurrency(activity.income)} income · ${formatCurrency(activity.expenses)} expenses`],
    ["debt", "Debt balance", formatCurrency(report.debt.balance), `${report.debt.accounts} liability accounts · ${formatCurrency(report.debt.monthlyPayment)} monthly`],
    ["networth", "Net worth", formatCurrency(report.netWorth.current), report.netWorth.change == null ? "Add snapshots to see movement" : `${report.netWorth.change >= 0 ? "+" : ""}${formatCurrency(report.netWorth.change)} over saved history`],
    ["goals", "Goal funding", report.goals.percent == null ? "—" : `${report.goals.percent.toFixed(0)}%`, `${formatCurrency(report.goals.funded)} of ${formatCurrency(report.goals.target)}`],
    ["portfolio", "Portfolio", formatCurrency(report.portfolio.value), `${report.portfolio.holdings} holdings · performance ${formatCurrency(report.portfolio.value - report.portfolio.cost)}`],
    ["subscriptions", "Subscriptions", formatCurrency(report.subscriptions.monthly), `${report.subscriptions.active} active monthly commitments`],
    ["health", "Health trend", report.health.length ? `${report.health.at(-1).score} / 100` : "—", report.health.length > 1 ? `${report.health.at(-1).score - report.health.at(-2).score >= 0 ? "+" : ""}${report.health.at(-1).score - report.health.at(-2).score} points month-over-month` : "More history needed"]
  ];
  const metrics = filters.entity === "all" ? allMetrics : allMetrics.filter(row => row[0] === filters.entity);
  const set = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  function exportCsv() { download(intelligenceReportCsv(report, activity), "text/csv;charset=utf-8", "finlume-financial-report.csv"); }
  async function exportPdf() {
    const [{ jsPDF }, table] = await Promise.all([import("jspdf"), import("jspdf-autotable")]); const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Finlume Financial Report", 14, 16); doc.setFontSize(9); doc.text(`Period: ${filters.start || "All dates"} to ${filters.end || "latest"} | Account: ${filters.account || "All"} | Category: ${filters.category || "All"}`, 14, 23);
    table.default(doc, { startY: 29, head: [["Summary", "Value", "Detail"]], body: metrics.map(([, label, value, detail]) => [label, value, detail]), styles: { fontSize: 8 }, headStyles: { fillColor: [79, 70, 229] }, rowPageBreak: "avoid" });
    table.default(doc, { startY: doc.lastAutoTable.finalY + 8, head: [["Category", "Spending"]], body: activity.byCategory.map(([name, value]) => [name, formatCurrency(value)]), styles: { fontSize: 8 }, headStyles: { fillColor: [79, 70, 229] }, rowPageBreak: "avoid" });
    if (activity.budgetActual.length) table.default(doc, { startY: doc.lastAutoTable.finalY + 8, head: [["Budget category", "Budget", "Actual", "Variance"]], body: activity.budgetActual.map(row => [row.category, formatCurrency(row.budget), formatCurrency(row.actual), formatCurrency(row.budget - row.actual)]), styles: { fontSize: 8 }, headStyles: { fillColor: [79, 70, 229] }, rowPageBreak: "avoid" });
    doc.save("finlume-financial-report.pdf");
  }
  const cls = "min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-[12px]";
  const select = (label, key, values) => React.createElement("label", { className: "text-[11px] text-slate-500" }, label, React.createElement("select", { value: filters[key], onChange: event => set(key, event.target.value), className: cls + " w-full mt-1" }, values.map(([value, text]) => React.createElement("option", { key: value, value }, text))));
  return React.createElement(Card, { className: "p-5" },
    React.createElement("div", { className: "flex items-center justify-between gap-3 mb-3 flex-wrap" }, React.createElement("div", null, React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700" }, "Financial intelligence report"), React.createElement("p", { className: "text-[11.5px] text-slate-500" }, "Dashboard-consistent summaries with shared filters and exports.")), React.createElement("div", { className: "flex gap-2" }, React.createElement("button", { type: "button", onClick: exportCsv, className: cls + " font-semibold text-indigo-700" }, "Download CSV"), React.createElement("button", { type: "button", onClick: exportPdf, className: cls + " font-semibold text-indigo-700" }, "Download PDF"))),
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 mb-4" }, React.createElement("label", { className: "text-[11px] text-slate-500" }, "From", React.createElement("input", { type: "date", value: filters.start, onChange: event => set("start", event.target.value), className: cls + " w-full mt-1" })), React.createElement("label", { className: "text-[11px] text-slate-500" }, "To", React.createElement("input", { type: "date", value: filters.end, onChange: event => set("end", event.target.value), className: cls + " w-full mt-1" })), select("Account", "account", [["", "All accounts"], ...accounts.map(value => [value, value])]), select("Category", "category", [["", "All categories"], ...categories.map(value => [value, value])]), select("Report", "entity", [["all", "All reports"], ["cashflow", "Cash flow"], ["debt", "Debt"], ["networth", "Net worth"], ["goals", "Goals"], ["portfolio", "Portfolio"], ["subscriptions", "Subscriptions"], ["health", "Health"]])),
    React.createElement("p", { className: "text-[11px] text-slate-500 mb-3" }, `${filtered.length} transactions match these filters.`), React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" }, metrics.map(([, label, value, detail]) => React.createElement("div", { key: label, className: "rounded-xl bg-slate-50 p-3" }, React.createElement("p", { className: "text-[11px] text-slate-500" }, label), React.createElement("p", { className: "text-[17px] font-semibold text-slate-800" }, value), React.createElement("p", { className: "text-[11px] text-slate-500" }, detail))))
  );
}
