import React, { useMemo } from "react";

export function summarizeTransactionActivity(transactions, limit = 20) {
  const groups = new Map();
  for (const row of transactions) for (const entry of row.changeHistory || []) {
    if (!entry?.at || !Array.isArray(entry.changes)) continue;
    const key = entry.batchId || `${row.id}:${entry.at}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, at: entry.at, source: entry.source || "Edit", batch: !!entry.batchId, rows: [] };
      groups.set(key, group);
    }
    group.rows.push({ id: row.id, merchant: row.merchant, date: row.date, changes: entry.changes });
  }
  return [...groups.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export function TransactionActivity({ transactions }) {
  const events = useMemo(() => summarizeTransactionActivity(transactions), [transactions]);
  const content = events.length ? React.createElement("ol", { className: "space-y-2" },
    events.map(event => React.createElement("li", { key: event.key, className: "fin-history-entry rounded-xl border p-3 text-[12px]" },
      React.createElement("p", { className: "font-semibold" }, event.batch ? `Review batch · ${event.rows.length} transactions` : event.source, " · ", new Date(event.at).toLocaleString()),
      React.createElement("ul", { className: "mt-1 list-disc pl-5" }, event.rows.map(row =>
        React.createElement("li", { key: row.id }, row.merchant, " · ", row.date, " · ", row.changes.map(change => change.field).join(", ")))))))
    : React.createElement("p", { className: "text-[13px] py-2" }, "No confirmed transaction edits recorded yet.");
  return React.createElement("details", { className: "fin-history-details" },
    React.createElement("summary", { className: "fin-history-summary" }, "Recent transaction changes"),
    React.createElement("section", { className: "fin-history-panel rounded-2xl border p-4 mt-2", "aria-label": "Recent transaction changes" },
      React.createElement("h2", { className: "text-[15px] font-semibold mb-1" }, "Recent transaction changes"),
      React.createElement("p", { className: "text-[12px] opacity-75 mb-3" }, "Confirmed edits since history was enabled. Open a transaction to see its full recorded changes."),
      content));
}
