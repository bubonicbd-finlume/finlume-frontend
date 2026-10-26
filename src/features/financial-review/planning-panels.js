import React, { useMemo } from "react";
import { financialHealthScore, financialHealthTrend } from "../dashboard/health-score.js";
import { FinancialCoachPanel } from "../dashboard/financial-coach.js";

function activeDebtPayment(settings, liabilityEffectivePayment) {
  return (settings.netWorthAccounts || [])
    .filter(account => account.type === "liability" && Number(account.balance) > 0)
    .reduce((sum, account) => sum + liabilityEffectivePayment(account), 0);
}

export function FinancialReviewPanels({ transactions, settings, Card, Sparkles, formatCurrency, computeMonthlyInsight, liabilityEffectivePayment, onGoTo, onSaveSettings, today }) {
  const healthInputs = useMemo(() => ({
    liquidAssets: (settings.netWorthAccounts || []).length > 0
      ? settings.netWorthAccounts.filter(account => account.type === "asset" && account.category === "Cash & Bank")
        .reduce((sum, account) => sum + (Number(account.balance) || 0), 0)
      : null,
    monthlyDebt: activeDebtPayment(settings, liabilityEffectivePayment),
    goals: settings.goals || []
  }), [settings.netWorthAccounts, settings.goals, liabilityEffectivePayment]);
  const monthlyInsight = useMemo(() => computeMonthlyInsight(transactions), [transactions, computeMonthlyInsight]);
  const health = useMemo(() => financialHealthScore({
    monthlyIncome: monthlyInsight?.cur?.income,
    monthlySpending: monthlyInsight?.cur?.spending,
    ...healthInputs
  }), [monthlyInsight, healthInputs]);
  const healthTrend = useMemo(() => financialHealthTrend({ transactions, ...healthInputs }), [transactions, healthInputs]);
  const healthDelta = healthTrend.length > 1 ? healthTrend.at(-1).score - healthTrend.at(-2).score : null;
  return React.createElement(React.Fragment, null,
    React.createElement(Card, { className: "p-5" },
      React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700" }, "Financial health"),
      health.score === null
        ? React.createElement("p", { className: "text-[12px] text-slate-500 mt-2" }, health.message)
        : React.createElement(React.Fragment, null,
          React.createElement("p", { className: "text-[24px] font-semibold text-indigo-700 mt-1" }, health.score, " / 100"),
          React.createElement("p", { className: "text-[11px] text-slate-500" }, health.message, " ", health.coverageWeight, " of 100 factor-weight points available."),
          React.createElement("p", { className: "text-[12px] text-slate-600 mt-2" }, "Strongest: ", health.strongest.label, ". To improve: ", health.suggestion),
          healthDelta !== null && React.createElement("p", { className: `text-[12px] mt-1 font-medium ${healthDelta >= 0 ? "text-emerald-700" : "text-amber-700"}` }, "Month-over-month: ", healthDelta >= 0 ? "+" : "", healthDelta, " points"),
          React.createElement("ul", { className: "mt-2 space-y-1" }, [...health.positives.slice(0, 2), ...health.attention.slice(0, 2)].map((item, index) => React.createElement("li", { key: index, className: "text-[11px] text-slate-500" }, item))),
          React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3" }, health.factors.map(factor => React.createElement("div", { key: factor.key, className: "rounded-xl border border-slate-100 bg-slate-50 p-2.5" },
            React.createElement("div", { className: "flex justify-between gap-2 text-[12px] font-medium text-slate-700" }, React.createElement("span", null, factor.label), React.createElement("span", null, factor.value, " / 100")),
            React.createElement("p", { className: "text-[11px] text-slate-500 mt-1" }, factor.detail))))
        )
    ),
    React.createElement(FinancialCoachPanel, { transactions, settings, onGoTo, onSaveSettings, Card, formatCurrency, today })
  );
}
