import React from "react";
import { liabilityOverviewMetrics } from "./overview-metrics.js";

export function LiabilityOverviewPanel({ accounts, transactions, today, Card, formatCurrency, formatDateDisplay }) {
  const metrics = liabilityOverviewMetrics(accounts, transactions, today);
  if (!metrics.activeCount) return null;
  return React.createElement(Card, { className: "p-5" },
    React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700 mb-3" }, "Repayment outlook"),
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" }, [
      ["Estimated remaining interest", metrics.remainingInterest == null ? "Unavailable" : formatCurrency(metrics.remainingInterest)],
      ["Estimated debt-free date", metrics.debtFreeDate ? formatDateDisplay(metrics.debtFreeDate) : "Unavailable"],
      ["Payments / recorded income", metrics.paymentToIncomePct == null ? "Add income history" : `${metrics.paymentToIncomePct.toFixed(1)}%`]
    ].map(([label, value]) => React.createElement("div", { key: label, className: "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" }, React.createElement("p", { className: "text-[11px] text-slate-500" }, label), React.createElement("p", { className: "text-[15px] font-semibold text-slate-800" }, value)))),
    React.createElement("p", { className: "text-[11px] text-slate-500 mt-3" }, "Estimates hold current rates and monthly payments constant. Missing rates or payments that do not cover interest make payoff estimates unavailable. Payment-to-income uses income recorded in completed months."),
    React.createElement("h4", { className: "text-[12px] font-semibold text-slate-700 mt-4 mb-2" }, "Outstanding by category"),
    React.createElement("ul", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" }, metrics.categories.map(category => React.createElement("li", { key: category.name, className: "flex justify-between gap-2 text-[12px] rounded-lg border border-slate-100 px-3 py-2" }, React.createElement("span", { className: "text-slate-600" }, category.name), React.createElement("span", { className: "font-semibold text-slate-800" }, formatCurrency(category.value))))));
}
