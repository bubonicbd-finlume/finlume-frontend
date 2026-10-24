import React, { useState } from "react";

export function createBudgetPlanningCard({ Button, Card, Wallet, formatCurrency, hasSystemTag, inputCls, isSelfTransfer, monthlyEquivalent, todayYMD }) {
function BudgetPlanningCard({ transactions, settings, onSaveSettings, onConfirmMonthlyPlanIncome }) {
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState(String(settings.monthlyPlanIncome || ""));
  const [incomeSaving, setIncomeSaving] = useState(false);
  const [incomeError, setIncomeError] = useState("");
  const budgetTools = window.__FINLUME_FEATURES__.budgets;
  const suggestedIncome = budgetTools.averageCompletedMonthIncome(transactions, todayYMD(), 3, {
    isSelfTransfer,
    isRefund: transaction => hasSystemTag(transaction, "Refund")
  });
  const { plannedIncome, budgetTotal, recurringTotal, unallocated } = budgetTools.envelopeSummary({
    budgets: settings.budgets,
    recurring: settings.recurring,
    subscriptions: settings.subscriptions,
    plannedIncome: settings.monthlyPlanIncome,
    suggestedIncome,
    monthlyEquivalent
  });
  async function saveIncome() {
    if (incomeSaving) return;
    const nextIncome = Math.max(0, Number(incomeDraft) || 0);
    setIncomeSaving(true);
    setIncomeError("");
    try {
      if (onConfirmMonthlyPlanIncome) await onConfirmMonthlyPlanIncome(settings.monthlyPlanIncome, nextIncome);
      else await onSaveSettings({ monthlyPlanIncome: nextIncome });
      setEditingIncome(false);
    } catch (error) {
      setIncomeError(error?.message || "The income plan could not be confirmed. Review and retry.");
    } finally {
      setIncomeSaving(false);
    }
  }
  return React.createElement(Card, { className: "p-5" },
    React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-3" },
      React.createElement("div", null,
        React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700 flex items-center gap-1.5" }, React.createElement(Wallet, { size: 14, className: "text-indigo-500" }), "Monthly money plan"),
        React.createElement("p", { className: "text-[12px] text-slate-500 mt-1" }, "Give every part of your expected income a job before the month begins.")
      ),
      editingIncome ? React.createElement("div", { className: "flex gap-2" },
        React.createElement("input", { type: "number", value: incomeDraft, onChange: event => setIncomeDraft(event.target.value), disabled: incomeSaving, className: inputCls + " !w-40", placeholder: "Expected income" }),
        React.createElement(Button, { variant: "primary", onClick: saveIncome, disabled: incomeSaving }, incomeSaving ? "Saving…" : "Save")
      ) : React.createElement("button", { onClick: () => { setIncomeDraft(String(settings.monthlyPlanIncome || Math.round(suggestedIncome) || "")); setIncomeError(""); setEditingIncome(true); }, className: "text-[12px] text-indigo-600 font-medium hover:underline" }, settings.monthlyPlanIncome ? "Change expected income" : "Set expected income")
    ),
    incomeError && React.createElement("p", { role: "alert", className: "mt-2 text-[12px] text-rose-700" }, incomeError),
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4" },
      [["Expected income", plannedIncome], ["Budget envelopes", budgetTotal], ["Recurring commitments", recurringTotal], [unallocated >= 0 ? "Still unallocated" : "Plan exceeds income", Math.abs(unallocated)]].map(([label, value], index) => React.createElement("div", { key: label, className: `rounded-xl border px-3 py-3 ${index === 3 ? unallocated >= 0 ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50" : "border-slate-200 bg-slate-50/70"}` }, React.createElement("p", { className: "text-[11px] text-slate-500" }, label), React.createElement("p", { className: `text-[15px] font-semibold mt-0.5 ${index === 3 ? unallocated >= 0 ? "text-emerald-700" : "text-rose-700" : "text-slate-700"}` }, formatCurrency(value))))
    ),
    !settings.monthlyPlanIncome && suggestedIncome > 0 && React.createElement("p", { className: "text-[10.5px] text-slate-400 mt-2" }, "Expected income currently uses your average income from the last three completed months. Save a value to plan with a fixed amount.")
  );
}
return BudgetPlanningCard;
}
