import React, { useMemo, useState } from "react";
import { amortizationSchedule, effectivePayment, requiredPayment } from "./calculations.js";

export function RepaymentPlanner({ accounts, today, formatCurrency }) {
  const [selectedId, setSelectedId] = useState("");
  const [extra, setExtra] = useState("0");
  const [oneTimeMonth, setOneTimeMonth] = useState("1");
  const [oneTimeAmount, setOneTimeAmount] = useState("0");
  const [enteredPayment, setEnteredPayment] = useState("");
  const active = accounts.filter(account => Number(account.balance) > 0);
  const account = active.find(item => item.id === selectedId) || active[0];
  const calculated = account ? requiredPayment(account, today) : 0;
  const contractual = account ? effectivePayment(account, today) : 0;
  const payment = enteredPayment === "" ? contractual : Number(enteredPayment);
  const base = useMemo(() => account ? amortizationSchedule(account, today, { payment }) : null, [account, today, payment]);
  const lumpMonth = Math.max(1, Math.trunc(Number(oneTimeMonth) || 1));
  const lumpAmount = Math.max(0, Number(oneTimeAmount) || 0);
  const plan = useMemo(() => account ? amortizationSchedule(account, today, { payment, extraPayment: Number(extra), oneTimePayments: lumpAmount ? { [lumpMonth]: lumpAmount } : {} }) : null, [account, today, payment, extra, lumpMonth, lumpAmount]);
  if (!account) return React.createElement("p", { className: "text-[13px] text-slate-500" }, "Add an active liability to view its repayment schedule.");
  return React.createElement("div", { className: "space-y-4" },
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" },
      React.createElement("label", { className: "text-[12px] font-medium text-slate-700" }, "Liability", React.createElement("select", { value: account.id, onChange: event => { setSelectedId(event.target.value); setEnteredPayment(""); }, className: "mt-1 w-full min-h-11 rounded-xl border border-slate-200 px-3 bg-white" }, active.map(item => React.createElement("option", { key: item.id, value: item.id }, item.name)))),
      React.createElement("label", { className: "text-[12px] font-medium text-slate-700" }, "Monthly payment assumption", React.createElement("input", { type: "number", min: "0", step: "0.01", value: enteredPayment === "" ? contractual.toFixed(2) : enteredPayment, onChange: event => setEnteredPayment(event.target.value), className: "mt-1 w-full min-h-11 rounded-xl border border-slate-200 px-3" })),
      React.createElement("label", { className: "text-[12px] font-medium text-slate-700" }, "Extra monthly payment", React.createElement("input", { type: "number", min: "0", step: "0.01", value: extra, onChange: event => setExtra(event.target.value), className: "mt-1 w-full min-h-11 rounded-xl border border-slate-200 px-3" }))),
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
      React.createElement("label", { className: "text-[12px] font-medium text-slate-700" }, "One-time early repayment", React.createElement("input", { type: "number", min: "0", step: "0.01", value: oneTimeAmount, onChange: event => setOneTimeAmount(event.target.value), className: "mt-1 w-full min-h-11 rounded-xl border border-slate-200 px-3" })),
      React.createElement("label", { className: "text-[12px] font-medium text-slate-700" }, "Apply in repayment month", React.createElement("input", { type: "number", min: "1", step: "1", value: oneTimeMonth, onChange: event => setOneTimeMonth(event.target.value), className: "mt-1 w-full min-h-11 rounded-xl border border-slate-200 px-3" }))),
    React.createElement("p", { className: "text-[12px] text-slate-500" }, calculated > 0 ? `Calculated payment to reach the saved end date: ${formatCurrency(calculated)}. ` : "No end-date payment can be calculated. ", Number(account.minPayment) > 0 ? `Saved lender payment: ${formatCurrency(account.minPayment)}. ` : "No lender payment has been saved. ", account.interestRate == null || account.interestRate === "" ? "No interest rate is saved; this schedule assumes 0%. " : "", account.interestType === "variable" ? "Variable-rate estimate: the current rate is held constant. " : "", "The schedule assumes monthly compounding and month-end payments; fees and irregular payments require updating the assumptions."),
    plan.neverPaysOff ? React.createElement("p", { role: "alert", className: "rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700" }, plan.reason || "The balance does not clear within 100 years at this payment.") : React.createElement(React.Fragment, null,
      React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" }, [["Estimated payoff", `${plan.months} months`], ["Estimated remaining interest", formatCurrency(plan.totalInterest)], ["Interest saved with extra payments", base?.neverPaysOff ? "Unavailable" : formatCurrency(Math.max(0, base.totalInterest - plan.totalInterest))]].map(([label, value]) => React.createElement("div", { key: label, className: "rounded-xl border border-slate-200 bg-white p-3" }, React.createElement("p", { className: "text-[11px] text-slate-500" }, label), React.createElement("p", { className: "text-[15px] font-semibold text-slate-800" }, value)))),
      React.createElement("div", { className: "max-h-[28rem] overflow-auto rounded-xl border border-slate-200" }, React.createElement("table", { className: "w-full min-w-[520px] text-[12px]" }, React.createElement("thead", { className: "sticky top-0 bg-slate-100 text-slate-600" }, React.createElement("tr", null, ["Month", "Payment", "Principal", "Interest", "Balance"].map(label => React.createElement("th", { key: label, className: "px-3 py-2 text-right first:text-left" }, label)))), React.createElement("tbody", null, plan.rows.map(row => React.createElement("tr", { key: row.month, className: "border-t border-slate-100" }, React.createElement("td", { className: "px-3 py-2" }, row.month), [row.payment, row.principal, row.interest, row.balance].map((value, index) => React.createElement("td", { key: index, className: "px-3 py-2 text-right tabular-nums" }, formatCurrency(value))))))))));
}
