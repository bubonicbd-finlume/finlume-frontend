import React, { useEffect, useMemo, useRef, useState } from "react";
import { applyReviewBatch, mergeReviewBatchResult } from "./review-batch.js";
import { reviewUndoEntries, undoReviewEntries } from "./review-undo.js";

export function ReviewWorkspace({ open, transactions, settings, allTags, onSave, onClose, formatCurrency, formatDateDisplay }) {
  const queue = useMemo(() => transactions.filter(row => row.category === "Needs review"), [transactions]);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [kind, setKind] = useState("category");
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [undoEntries, setUndoEntries] = useState([]);
  const [undoMessage, setUndoMessage] = useState("");
  const first = useRef(null);
  const batchIdRef = useRef(null);
  useEffect(() => { if (open) first.current?.focus(); }, [open]);
  const skippedIds = useMemo(() => new Set(skipped), [skipped]);
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const visible = useMemo(() => queue.filter(row => !skippedIds.has(row.id)), [queue, skippedIds]);
  const safeCursor = Math.min(cursor, Math.max(0, visible.length - 1));
  const current = visible[safeCursor];
  const chosen = selected.length ? queue.filter(row => selectedIds.has(row.id)) : current ? [current] : [];
  const queueStart = Math.max(0, Math.min(safeCursor - 20, Math.max(0, visible.length - 60)));
  const queueWindow = visible.slice(queueStart, queueStart + 60);
  const pending = result?.unfinished?.length ? chosen.filter(row => result.unfinished.some(item => item.id === row.id)) : chosen;
  function toggle(id) { setSelected(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); batchIdRef.current = null; setPreview(false); setResult(null); }
  function move(delta) { setCursor(index => Math.max(0, Math.min(visible.length - 1, index + delta))); batchIdRef.current = null; setPreview(false); setResult(null); }
  function patch(row) { return kind === "tag" ? { tags: [...new Set([...(row.tags || []), value])] } : kind === "account" ? { account: value } : { category: value, subcategory: undefined }; }
  async function apply() {
    setBusy(true);
    if (!batchIdRef.current) batchIdRef.current = globalThis.crypto?.randomUUID?.() || `review-${Date.now()}`;
    const outcome = await applyReviewBatch(pending, patch, (id, change) => onSave(id, change, { batchId: batchIdRef.current }));
    if (outcome.confirmed.length) { setUndoEntries(reviewUndoEntries(pending, outcome.confirmed, kind, value)); setUndoMessage(""); }
    setResult(previous => mergeReviewBatchResult(previous, outcome));
    if (!outcome.unfinished.length) batchIdRef.current = null;
    setPreview(outcome.unfinished.length > 0);
    setBusy(false);
  }
  async function undoLast() {
    if (!undoEntries.length || busy) return;
    setBusy(true);
    const outcome = await undoReviewEntries(undoEntries, transactions, (id, change) => onSave(id, change, { batchId: `review-undo-${Date.now()}` }));
    setUndoEntries(outcome.remaining);
    setUndoMessage(outcome.remaining.length ? `${outcome.undone} restored; ${outcome.remaining.length} could not be safely restored. Refresh and retry only if those transactions still match the review change.` : `${outcome.undone} transaction${outcome.undone === 1 ? "" : "s"} restored.`);
    setBusy(false);
  }
  return !open ? null : React.createElement("section", { className: "rounded-2xl border border-amber-200 bg-white p-4 space-y-4", "aria-label": "Transaction Review workspace", onKeyDown: event => { if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return; if (event.key === "ArrowDown") { event.preventDefault(); move(1); } if (event.key === "ArrowUp") { event.preventDefault(); move(-1); } } },
    React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" }, React.createElement("div", null, React.createElement("h2", { className: "text-lg font-semibold" }, "Transaction Review"), React.createElement("p", { className: "text-sm text-slate-600" }, `${queue.length} remaining · ${skipped.length} skipped this visit. Use Up and Down arrows to move through the queue.`)), React.createElement("button", { type: "button", ref: first, onClick: onClose, className: "px-3 py-2 rounded-lg border focus-visible:outline-2 focus-visible:outline-indigo-600" }, "Close review")),
    current ? React.createElement(React.Fragment, null,
      React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, React.createElement("button", { type: "button", onClick: () => move(-1), disabled: safeCursor === 0, className: "px-3 py-2 rounded-lg border disabled:opacity-50" }, "Previous"), React.createElement("span", { "aria-live": "polite" }, `${safeCursor + 1} of ${visible.length}`), React.createElement("button", { type: "button", onClick: () => move(1), disabled: safeCursor >= visible.length - 1, className: "px-3 py-2 rounded-lg border disabled:opacity-50" }, "Next"), React.createElement("button", { type: "button", onClick: () => { setSkipped(ids => [...ids, current.id]); setSelected(ids => ids.filter(id => id !== current.id)); setCursor(index => Math.max(0, Math.min(index, visible.length - 2))); setPreview(false); }, className: "px-3 py-2 rounded-lg border" }, "Skip for now")),
      React.createElement("div", { className: "max-h-64 overflow-y-auto space-y-1", "aria-label": "Review queue" }, visible.length > queueWindow.length && React.createElement("p", { className: "text-xs opacity-70" }, `Showing items ${queueStart + 1}–${queueStart + queueWindow.length} of ${visible.length}. Use Previous, Next, or arrow keys to move.`), queueWindow.map((row, offset) => { const index = queueStart + offset; return React.createElement("div", { key: row.id, className: `flex gap-3 rounded-lg border p-3 text-sm ${index === safeCursor ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}` }, React.createElement("input", { type: "checkbox", checked: selectedIds.has(row.id), onChange: () => toggle(row.id), "aria-label": `Select ${row.merchant} on ${row.date}` }), React.createElement("button", { type: "button", onClick: () => { setCursor(index); setPreview(false); setResult(null); }, className: "text-left flex-1 focus-visible:outline-2 focus-visible:outline-indigo-600" }, React.createElement("strong", null, row.merchant), ` · ${formatDateDisplay(row.date)} · ${formatCurrency(row.amount)} · ${row.account || "No account"} · ${row.category}`, row.ruleSuggestion ? ` · Suggested: ${row.ruleSuggestion}` : "")); })),
      React.createElement("div", { className: "flex flex-wrap gap-2 items-end" }, React.createElement("label", { className: "text-sm" }, "Correction", React.createElement("select", { value: kind, onChange: event => { setKind(event.target.value); setValue(""); batchIdRef.current = null; setResult(null); setPreview(false); }, className: "block border rounded-lg p-2" }, ["category", "tag", "account"].map(item => React.createElement("option", { key: item, value: item }, item)))), React.createElement("label", { className: "text-sm" }, "New value", React.createElement("select", { value, onChange: event => { setValue(event.target.value); batchIdRef.current = null; setPreview(false); setResult(null); }, className: "block border rounded-lg p-2" }, React.createElement("option", { value: "" }, "Choose"), (kind === "category" ? settings.categories.filter(item => item !== "Needs review") : kind === "account" ? settings.accounts : allTags).map(item => React.createElement("option", { key: item, value: item }, item))))),
      React.createElement("button", { type: "button", disabled: !value || !chosen.length || busy, onClick: () => setPreview(true), className: "px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50" }, `Preview ${chosen.length} change${chosen.length === 1 ? "" : "s"}`),
      preview && React.createElement("div", { className: "border rounded-xl p-3 space-y-2" }, React.createElement("h3", { className: "font-semibold" }, "Confirm these saved transaction edits"), React.createElement("ul", { className: "list-disc pl-5 text-sm" }, pending.map(row => React.createElement("li", { key: row.id }, `${row.merchant}, ${formatDateDisplay(row.date)}, ${formatCurrency(row.amount)}: ${kind === "tag" ? (row.tags || []).join(", ") || "no tags" : row[kind] || "none"} → ${value}`))), React.createElement("button", { type: "button", disabled: busy || !pending.length, onClick: apply, className: "px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50" }, busy ? "Confirming cloud writes…" : result?.unfinished?.length ? `Retry ${pending.length} unfinished` : "Apply changes")),
      result && React.createElement("p", { role: result.unfinished.length ? "alert" : "status", className: "text-sm" }, `${result.confirmed.length} confirmed; ${result.unfinished.length} unfinished.`, result.unfinished.length ? " Retry only unfinished records." : ""),
    ) : React.createElement("div", { className: "space-y-2" }, React.createElement("p", { className: "text-sm text-slate-600" }, queue.length ? "All remaining items were skipped for now." : "No recorded transactions need review."), queue.length > 0 && skipped.length > 0 && React.createElement("button", { type: "button", onClick: () => { setSkipped([]); setCursor(0); setSelected([]); setPreview(false); setResult(null); }, className: "px-3 py-2 rounded-lg border focus-visible:outline-2 focus-visible:outline-indigo-600" }, "Show skipped items")),
    !current && result && React.createElement("p", { role: "status", className: "text-sm" }, `${result.confirmed.length} cloud writes confirmed; ${result.unfinished.length} unfinished.`),
    undoEntries.length > 0 && React.createElement("button", { type: "button", disabled: busy, onClick: undoLast, className: "min-h-10 px-3 rounded-lg border border-indigo-300 text-indigo-700 text-sm font-medium disabled:opacity-50" }, `Undo last confirmed change${undoEntries.length === 1 ? "" : "s"} (${undoEntries.length})`),
    undoMessage && React.createElement("p", { role: undoEntries.length ? "alert" : "status", className: "text-sm text-slate-600" }, undoMessage));
}
