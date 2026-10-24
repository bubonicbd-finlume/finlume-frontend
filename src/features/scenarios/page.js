import React, { useMemo, useState } from "react";
import { compareScenario, safeScenarioSummary } from "./calculations.js";

const EMPTY = { incomePercent: 0, spendingPercent: 0, extraDebt: 0, extraGoal: 0 };

export function createScenarioPage({ Card, formatCurrency, frLiquidBalance, hasSystemTag, isSelfTransfer, monthlyEquivalent, normalizeMerchant, todayYMD }) {
  return function ScenarioPage({ transactions, settings, onGoTo }) {
    const today = todayYMD();
    const [days, setDays] = useState(90);
    const [opening, setOpening] = useState(String(settings.cashFlowOpeningBalance ?? frLiquidBalance(settings) ?? 0));
    const [scenarios, setScenarios] = useState([{ ...EMPTY }, { ...EMPTY }]);
    const [exportMessage, setExportMessage] = useState("");
    const forecastOptions = { isSelfTransfer, isRefund: item => hasSystemTag(item, "Refund"), monthlyEquivalent, normalizeMerchant };
    const results = useMemo(() => [EMPTY, ...scenarios].map(assumptions => compareScenario({ transactions, settings, today, opening: Number(opening), days: Number(days), assumptions, forecastOptions })), [transactions, settings, today, opening, days, scenarios]);
    function update(index, field, value) { setScenarios(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)); setExportMessage(""); }
    function exportSummary() {
      try {
        const content = safeScenarioSummary(results, Number(days));
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed.scenarios) || parsed.scenarios.length !== 3 || parsed.scenarios.some(item => Object.keys(item).some(key => !["scenario", "days", "projectedEnding", "projectedMinimum", "payoffMonths", "goalProjected", "assumptions"].includes(key)))) throw new Error("Summary validation failed.");
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = "finlume-scenario-summary.json"; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setExportMessage("A summary with aggregate estimates and assumptions was prepared. It contains no transaction or account names.");
      } catch (error) { setExportMessage(error?.message || "Could not prepare the summary."); }
    }
    const fields = [
      { key: "incomePercent", label: "Monthly income change (%)", min: -100, max: 300 },
      { key: "spendingPercent", label: "Spending change (%)", min: -100, max: 300 },
      { key: "extraDebt", label: "Extra monthly loan payment", min: 0, max: 1000000000 },
      { key: "extraGoal", label: "Extra monthly goal contribution", min: 0, max: 1000000000 }
    ];
    return React.createElement("div", { className: "p-4 md:p-8 pb-28 max-w-6xl mx-auto space-y-4" },
      React.createElement("header", null, React.createElement("h1", { className: "text-2xl font-semibold text-slate-800" }, "Scenario Workspace"), React.createElement("p", { className: "text-[13px] text-slate-500 mt-1" }, "Compare estimates side by side. Assumptions stay on this page and never change saved transactions, balances, or schedules.")),
      React.createElement(Card, { className: "p-4 flex flex-wrap gap-4" },
        React.createElement("label", { className: "text-[12px] font-medium text-slate-700 flex flex-col gap-1" }, "Opening balance assumption", React.createElement("input", { type: "number", value: opening, onChange: event => setOpening(event.target.value), className: "min-h-11 rounded-xl border border-slate-200 px-3 text-[13px]" })),
        React.createElement("label", { className: "text-[12px] font-medium text-slate-700 flex flex-col gap-1" }, "Forecast period", React.createElement("select", { value: days, onChange: event => setDays(Number(event.target.value)), className: "min-h-11 rounded-xl border border-slate-200 px-3 text-[13px]" }, [30, 90, 180, 365].map(value => React.createElement("option", { key: value, value }, `${value} days`))))
      ),
      React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4" }, results.map((result, index) => React.createElement(Card, { key: index, className: "p-4 min-w-0" },
        React.createElement("h2", { className: "text-[15px] font-semibold text-slate-800" }, index === 0 ? "Current plan" : `Scenario ${index}`),
        React.createElement("p", { className: "text-[11.5px] text-slate-500 mt-1 mb-3" }, index === 0 ? "Based on saved values; still a forecast." : "Changes below are assumptions only."),
        index > 0 && React.createElement("div", { className: "space-y-2 mb-4" }, fields.map(field => React.createElement("label", { key: field.key, className: "block text-[11.5px] font-medium text-slate-600" }, field.label, React.createElement("input", { type: "number", min: field.min, max: field.max, value: scenarios[index - 1][field.key], onChange: event => update(index - 1, field.key, event.target.value), className: "mt-1 w-full min-h-11 rounded-xl border border-slate-200 px-3 text-[13px]" })))),
        React.createElement("dl", { className: "space-y-2 text-[12px]" },
          [["Projected balance at end", formatCurrency(result.ending)], ["Estimated low balance", formatCurrency(result.minimum)], ["Projected monthly income", formatCurrency(result.incomeMonthly)], ["Projected monthly other spending", formatCurrency(result.otherMonthly)], ["First saved loan payoff", result.payoffMonths == null ? "Unavailable" : `${result.payoffMonths} months`], ["First saved goal projection", result.goalProjected == null ? "Unavailable" : formatCurrency(result.goalProjected)]].map(([label, value]) => React.createElement("div", { key: label, className: "flex justify-between gap-2 border-t border-slate-100 pt-2" }, React.createElement("dt", { className: "text-slate-500" }, label), React.createElement("dd", { className: "font-semibold text-slate-800 text-right" }, value))))
      ))),
      React.createElement(Card, { className: "p-4 flex flex-wrap items-center justify-between gap-3" }, React.createElement("p", { className: "text-[12px] text-slate-500" }, "The summary exports aggregate numbers and assumption values only."), React.createElement("button", { type: "button", onClick: exportSummary, className: "min-h-11 px-4 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" }, "Export safe summary"), exportMessage && React.createElement("p", { role: "status", className: "w-full text-[12px] text-slate-600" }, exportMessage)),
      React.createElement("div", { className: "flex flex-wrap gap-3 text-[12px]" }, [["Financial Review", "review"], ["Liabilities", "liabilities"], ["Goals", "goals"]].map(([label, tab]) => React.createElement("button", { key: tab, type: "button", onClick: () => onGoTo(tab), className: "min-h-11 px-3 rounded-xl border border-indigo-200 bg-white text-indigo-700 font-semibold" }, `Open ${label}`)))
    );
  };
}
