import React, { useState } from "react";

export function calculatePurchasePlan({ price, saved, months, monthlyRoom, instalment, instalmentMonths, fees }) {
  const cost = Math.max(0, Number(price) || 0);
  const reserved = Math.min(cost, Math.max(0, Number(saved) || 0));
  const count = Math.max(1, Math.min(120, Math.trunc(Number(months) || 1)));
  const monthlyNeeded = (cost - reserved) / count;
  const room = Math.max(0, Number(monthlyRoom) || 0);
  const payLaterTotal = Math.max(0, Number(instalment) || 0) * Math.max(0, Number(instalmentMonths) || 0) + Math.max(0, Number(fees) || 0);
  return { monthlyNeeded, remaining: cost - reserved, monthlyGap: Math.max(0, monthlyNeeded - room), payLaterTotal, extraCost: payLaterTotal - cost };
}

export function createPurchasePlanCard({ Card, formatCurrency }) {
  return function PurchasePlanCard() {
    const [price, setPrice] = useState("");
    const [saved, setSaved] = useState("");
    const [months, setMonths] = useState("3");
    const [monthlyRoom, setMonthlyRoom] = useState("");
    const [instalment, setInstalment] = useState("");
    const [instalmentMonths, setInstalmentMonths] = useState("");
    const [fees, setFees] = useState("");
    const plan = calculatePurchasePlan({ price, saved, months, monthlyRoom, instalment, instalmentMonths, fees });
    const field = (label, value, onChange, min = 0) => React.createElement("label", { className: "block text-[12px] font-medium text-slate-600" }, label,
      React.createElement("input", { type: "number", inputMode: "decimal", min, step: "any", value, onChange: event => onChange(event.target.value), className: "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500" }));
    return React.createElement(Card, { className: "p-5 lg:col-span-2" },
      React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700" }, "Plan the cash purchase"),
      React.createElement("p", { className: "mt-1 text-[12px] text-slate-500" }, "Try a target price and date. Figures stay on this page until you leave."),
      React.createElement("div", { className: "mt-4 grid grid-cols-2 gap-3 md:grid-cols-4" }, field("Total price (₹)", price, setPrice), field("Already set aside (₹)", saved, setSaved), field("Months until purchase", months, setMonths, 1), field("Room in monthly budget (₹)", monthlyRoom, setMonthlyRoom)),
      Number(price) > 0 && React.createElement("div", { className: "mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4", role: "status" },
        React.createElement("p", { className: "text-[14px] font-semibold text-indigo-800" }, formatCurrency(plan.monthlyNeeded), " to set aside each month"),
        React.createElement("p", { className: "mt-1 text-[12px] text-indigo-700" }, formatCurrency(plan.remaining), " remaining to fund", Number(monthlyRoom) > 0 ? plan.monthlyGap > 0 ? ` · ${formatCurrency(plan.monthlyGap)} more than your stated monthly room` : " · fits within your stated monthly room" : " · add your monthly budget room to compare")),
      React.createElement("details", { className: "mt-4 rounded-xl border border-slate-200 p-3" }, React.createElement("summary", { className: "cursor-pointer text-[12.5px] font-semibold text-slate-700" }, "Compare an instalment offer"),
        React.createElement("div", { className: "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3" }, field("Payment per month (₹)", instalment, setInstalment), field("Number of payments", instalmentMonths, setInstalmentMonths, 1), field("Upfront fees (₹)", fees, setFees)),
        Number(instalment) > 0 && Number(instalmentMonths) > 0 && React.createElement("p", { className: "mt-3 text-[13px] text-slate-700" }, "Total paid: ", formatCurrency(plan.payLaterTotal), Number(price) > 0 && ` · ${plan.extraCost >= 0 ? "Extra cost" : "Difference vs listed price"}: ${formatCurrency(Math.abs(plan.extraCost))}`)));
  };
}
