import React, { useMemo, useState } from "react";
import { importSessionRows, normalizeImportHistory } from "./import-history.js";

export function ImportHistoryPanel({ transactions, history, onView, onReverse, onRecoverIssue, formatCurrency, formatDateDisplay, Modal }) {
  const [expanded, setExpanded] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const entries = useMemo(() => {
    const recorded = normalizeImportHistory(history);
    const known = new Set(recorded.map(item => item.id));
    const inferred = new Map();
    for (const row of transactions) if (row.importSessionId && !known.has(row.importSessionId)) {
      const entry = inferred.get(row.importSessionId);
      if (entry) entry.inserted++;
      else inferred.set(row.importSessionId, { id: row.importSessionId, at: row.createdAt || new Date(0).toISOString(), source: row.source || "Earlier import", account: row.account || "", inserted: 1, inferred: true });
    }
    return [...recorded, ...inferred.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
  }, [history, transactions]);
  const rows = useMemo(() => expanded ? importSessionRows(transactions, expanded) : [], [transactions, expanded]);
  async function reverse() {
    if (!preview || busy) return;
    setBusy(true); setError("");
    try {
      await onReverse(preview.id, preview.rows);
      setPreview(null);
    } catch (cause) {
      setError(cause?.message || "The reversal could not be confirmed.");
    } finally { setBusy(false); }
  }
  return React.createElement("section", { className: "fin-history-panel rounded-2xl border p-4", "aria-label": "Import history" },
    React.createElement("h2", { className: "text-[15px] font-semibold mb-1" }, "Import history"),
    React.createElement("p", { className: "text-[12px] opacity-75 mb-3" }, "Recent confirmed statement imports. Older imports without a session ID cannot be grouped or reversed."),
    entries.length === 0 ? React.createElement("p", { className: "text-[13px] py-3" }, "No recorded import sessions yet.") :
      React.createElement("div", { className: "space-y-2" }, entries.map(entry => {
        const count = importSessionRows(transactions, entry.id).length;
        return React.createElement("div", { key: entry.id, className: "fin-history-entry rounded-xl border p-3" },
          React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-2" },
            React.createElement("div", null,
              React.createElement("p", { className: "font-medium text-[13px]" }, entry.source, entry.account ? ` · ${entry.account}` : ""),
              React.createElement("p", { className: "text-[11px] opacity-70" }, new Date(entry.at).toLocaleString(), " · ", entry.id.slice(0, 8), entry.reversedAt ? " · Reversed" : "")),
            React.createElement("div", { className: "flex flex-wrap gap-2" },
              React.createElement("button", { type: "button", className: "fin-history-action", onClick: () => setExpanded(expanded === entry.id ? null : entry.id), "aria-expanded": expanded === entry.id }, expanded === entry.id ? "Hide rows" : `Inspect ${count} current rows`),
              count > 0 && React.createElement("button", { type: "button", className: "fin-history-action", onClick: () => onView(entry.id) }, "View in Transactions"),
              count > 0 && !entry.reversedAt && React.createElement("button", { type: "button", className: "fin-history-action fin-history-danger", onClick: () => { setError(""); setPreview({ id: entry.id, rows: importSessionRows(transactions, entry.id).map(row => ({ ...row, tags: [...(row.tags || [])], changeHistory: row.changeHistory ? structuredClone(row.changeHistory) : undefined })) }); } }, "Reverse remaining rows"))),
          React.createElement("p", { className: "text-[12px] mt-2" }, entry.inferred ? `${entry.inserted} current rows · duplicate, invalid, and unconfirmed counts were not recorded for this earlier import` : `${entry.sourceRows} source · ${entry.inserted} added · ${entry.duplicates} duplicate · ${entry.invalid} invalid · ${entry.unconfirmed} unconfirmed`),
          expanded === entry.id && React.createElement("div", { className: "fin-history-rows mt-3 max-h-60 overflow-y-auto" },
            React.createElement("h3", { className: "font-semibold text-[12px]" }, "Added rows"),
            rows.length ? rows.map(row => React.createElement("div", { key: row.id, className: "flex flex-wrap justify-between gap-2 border-t py-2 text-[12px]" }, React.createElement("span", null, formatDateDisplay(row.date), " · ", row.merchant, " · ", row.account), React.createElement("span", null, row.category, " · ", formatCurrency(row.amount)))) : React.createElement("p", { className: "py-2 text-[12px]" }, "No current rows remain in this session."),
            !!entry.duplicateRows?.length && React.createElement(React.Fragment, null,
              React.createElement("h3", { className: "font-semibold text-[12px] mt-2" }, "Duplicates already in Transactions"),
              entry.duplicateRows.map((row, index) => React.createElement("p", { key: index, className: "border-t py-2 text-[12px]" }, row.date, " · ", row.merchant, " · ", row.amount, " · ", row.account))),
            !!entry.invalidRows?.length && React.createElement(React.Fragment, null,
              React.createElement("h3", { className: "font-semibold text-[12px] mt-2" }, "Rejected rows"),
              entry.invalidRows.map((row, index) => React.createElement("div", { key: index, className: "flex flex-wrap items-center justify-between gap-2 border-t py-2 text-[12px]" },
                React.createElement("span", null, row.reason, " · ", row.date || "No date", " · ", row.merchant || "No merchant", " · ", row.amount || "No amount"),
                onRecoverIssue && React.createElement("button", { type: "button", className: "fin-history-action", onClick: () => onRecoverIssue(row, entry) }, "Correct and add"))))));
      })),
    React.createElement(Modal, { open: !!preview, onClose: () => { if (!busy) setPreview(null); }, title: "Reverse import", width: "max-w-lg" },
      preview && React.createElement(React.Fragment, null,
        React.createElement("p", { className: "text-[13px] mb-3" }, `Remove these ${preview.rows.length} transactions from this import? This will change financial totals. FinLume will recheck every row against the cloud before removing it.`),
        React.createElement("div", { className: "fin-history-rows max-h-52 overflow-y-auto mb-3" }, preview.rows.map(row => React.createElement("div", { key: row.id, className: "flex justify-between gap-2 border-t py-2 text-[12px]" }, React.createElement("span", null, formatDateDisplay(row.date), " · ", row.merchant), React.createElement("span", null, formatCurrency(row.amount))))),
        error && React.createElement("p", { role: "alert", className: "text-rose-600 text-[12px] mb-2" }, error),
        React.createElement("div", { className: "flex flex-wrap justify-end gap-2" },
          React.createElement("button", { type: "button", className: "fin-history-action", disabled: busy, onClick: () => setPreview(null) }, "Keep transactions"),
          React.createElement("button", { type: "button", className: "fin-history-action fin-history-danger", disabled: busy, onClick: reverse }, busy ? "Confirming…" : `Reverse ${preview.rows.length} rows`)))));
}
