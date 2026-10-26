import React, { useState } from "react";

export function LiabilityPaymentAction({ liability, accounts, today, uid, onRecord, Modal, Button, formatCurrency }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  if (!onRecord || !(Number(liability.balance) > 0)) return null;
  function begin() {
    const interest = Math.round((Number(liability.balance) || 0) * (Number(liability.interestRate) || 0) / 1200 * 100) / 100;
    const payment = Math.max(0, Number(liability.minPayment) || 0);
    setDraft({ paymentId: "liability-payment:" + uid(), date: today, account: accounts[0] || "", principal: Math.max(0, payment - interest).toFixed(2), interest: interest.toFixed(2), fees: "0", notes: "" });
    setError(""); setOpen(true);
  }
  async function confirm() {
    if (busy) return;
    setBusy(true); setError("");
    try { await onRecord({ ...draft, liabilityId: liability.id }); setOpen(false); }
    catch (cause) { setError(cause?.message || "The liability payment could not be confirmed."); }
    finally { setBusy(false); }
  }
  const total = Number(draft?.principal || 0) + Number(draft?.interest || 0) + Number(draft?.fees || 0);
  const input = "mt-1 w-full min-h-11 rounded-xl border border-slate-200 px-3";
  const fields = [["date", "Payment date", "date"], ["account", "Funding account", "select"], ["principal", "Principal paid", "number"], ["interest", "Interest expense", "number"], ["fees", "Fees", "number"]];
  return React.createElement(React.Fragment, null,
    React.createElement("button", { type: "button", onClick: begin, className: "min-h-10 px-2 text-[11.5px] font-semibold text-indigo-700 hover:underline" }, "Record payment"),
    React.createElement(Modal, { open, onClose: () => { if (!busy) setOpen(false); }, title: "Record liability payment" }, draft && React.createElement("div", { className: "space-y-3" },
      React.createElement("p", { className: "text-[12.5px] text-slate-600" }, liability.name, " · outstanding ", formatCurrency(Number(liability.balance) || 0)),
      React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, fields.map(([name, label, type]) => React.createElement("label", { key: name, className: "text-[12px] font-medium text-slate-700" }, label, type === "select" ? React.createElement("select", { className: input, value: draft[name], disabled: busy, onChange: event => setDraft(value => ({ ...value, [name]: event.target.value })) }, accounts.map(account => React.createElement("option", { key: account, value: account }, account))) : React.createElement("input", { className: input, type, min: type === "number" ? "0" : undefined, step: type === "number" ? "0.01" : undefined, value: draft[name], disabled: busy, onChange: event => setDraft(value => ({ ...value, [name]: event.target.value })) })))),
      React.createElement("label", { className: "text-[12px] font-medium text-slate-700" }, "Notes (optional)", React.createElement("input", { className: input, value: draft.notes, disabled: busy, onChange: event => setDraft(value => ({ ...value, notes: event.target.value })) })),
      React.createElement("p", { className: "rounded-xl bg-slate-50 p-3 text-[12px] text-slate-600" }, "Total cash paid: ", formatCurrency(total), ". Principal reduces the liability; interest and fees remain expenses."),
      error && React.createElement("p", { role: "alert", className: "text-[12px] text-rose-700" }, error),
      React.createElement("div", { className: "flex justify-end gap-2" }, React.createElement(Button, { variant: "outline", disabled: busy, onClick: () => setOpen(false) }, "Cancel"), React.createElement(Button, { variant: "primary", disabled: busy || !draft.account || !(Number(draft.principal) > 0), onClick: confirm }, busy ? "Recording…" : "Confirm payment"))
    ))
  );
}
