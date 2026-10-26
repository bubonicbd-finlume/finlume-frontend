import React, { useMemo, useState } from "react";
import { buildActionableInsights, dismissInsight, snoozeInsight } from "./actionable-insights.js";

export function ActionableInsightsPanel({ Card, transactions, settings, onSaveSettings, onGoTo, today }) {
  const [busy, setBusy] = useState("");
  const items = useMemo(() => buildActionableInsights({ transactions, settings, today }), [transactions, settings, today]);
  async function update(id, patch) { setBusy(id); try { await onSaveSettings(patch); } finally { setBusy(""); } }
  if (!items.length) return null;
  const tones = { urgent: "border-rose-200 bg-rose-50", warning: "border-amber-200 bg-amber-50", info: "border-sky-200 bg-sky-50" };
  return React.createElement("section", null, React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700 mb-3" }, "Actionable insights"), React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3" }, items.map(item => React.createElement(Card, { key: item.id, className: `p-4 border ${tones[item.severity]}` }, React.createElement("div", { className: "flex justify-between gap-3" }, React.createElement("div", null, React.createElement("p", { className: "text-[13.5px] font-semibold text-slate-800" }, item.title), React.createElement("p", { className: "text-[12px] text-slate-600 mt-1" }, item.detail), React.createElement("p", { className: "text-[10.5px] text-slate-500 mt-1" }, item.dateRange, " · ", item.severity)), React.createElement("div", { className: "flex flex-col gap-1 shrink-0" }, React.createElement("button", { type: "button", onClick: () => onGoTo(item.tab), className: "min-h-9 px-2 text-[11px] font-semibold text-indigo-700" }, item.action), React.createElement("button", { type: "button", disabled: busy === item.id, onClick: () => update(item.id, snoozeInsight(settings, item.id, today)), className: "min-h-9 px-2 text-[11px] text-slate-600" }, "Snooze 7 days"), React.createElement("button", { type: "button", disabled: busy === item.id, onClick: () => update(item.id, dismissInsight(settings, item.id)), className: "min-h-9 px-2 text-[11px] text-slate-600" }, "Dismiss")))))));
}
