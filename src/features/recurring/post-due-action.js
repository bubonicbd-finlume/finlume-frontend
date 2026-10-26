import React, { useState } from "react";

export function RecurringPostAction({ item, today, onPost, onSkip, Modal, Button, formatCurrency, formatDateDisplay }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!onPost || item.active === false || !item.nextDate || item.nextDate > today) return null;
  async function confirm() {
    if (busy) return;
    setBusy(true); setError("");
    try { await onPost(item.kind, item.id, item.nextDate); setOpen(false); }
    catch (cause) { setError(cause?.message || "The occurrence could not be confirmed. Review and retry."); }
    finally { setBusy(false); }
  }
  async function skip() {
    if (busy || !onSkip) return;
    setBusy(true); setError("");
    try { await onSkip(item.kind, item.id, item.nextDate); setOpen(false); }
    catch (cause) { setError(cause?.message || "The occurrence could not be skipped. Review and retry."); }
    finally { setBusy(false); }
  }
  return React.createElement(React.Fragment, null,
    React.createElement("button", { type: "button", onClick: () => setOpen(true), className: "min-h-10 px-2 text-[11.5px] text-indigo-700 font-semibold hover:underline" }, "Record due"),
    React.createElement(Modal, { open, onClose: () => { if (!busy) setOpen(false); }, title: "Confirm scheduled occurrence" },
      React.createElement("div", { className: "space-y-3 text-[13px] text-slate-600" },
        React.createElement("p", null, `${item.type === "income" ? "Income" : "Expense"}: ${item.name} · ${formatCurrency(Number(item.amount) || 0)} · ${formatDateDisplay(item.nextDate)}`),
        React.createElement("p", null, "Finlume will link one exact matching transaction if it exists, or record this occurrence once. The next due date will advance in the same confirmed save."),
        error && React.createElement("p", { role: "alert", className: "text-rose-600" }, error),
        React.createElement("div", { className: "flex flex-wrap justify-end gap-2" }, React.createElement(Button, { variant: "outline", disabled: busy, onClick: () => setOpen(false) }, "Cancel"), onSkip && React.createElement(Button, { variant: "outline", disabled: busy, onClick: skip }, busy ? "Saving…" : "Skip occurrence"), React.createElement(Button, { variant: "primary", disabled: busy, onClick: confirm }, busy ? "Recording…" : "Confirm record")))));
}
