import React from "react";
import { previewCategorizationRule } from "./rule-preview.js";

export function RulePreviewPanel({ transactions, settings, draft, source, savedIndex = -1 }) {
  const matches = previewCategorizationRule(transactions, settings, draft, source, savedIndex);
  return React.createElement("section", { "aria-label": "Rule preview", className: "rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 my-3" },
    React.createElement("h5", { className: "text-[12.5px] font-semibold text-indigo-800" }, "Preview against saved transactions"),
    React.createElement("p", { className: "text-[11.5px] text-slate-600 mt-1" }, "Up to 25 matches from the first 500 loaded transactions. This does not recategorise saved records."),
    matches.length ? React.createElement("ul", { className: "space-y-2 mt-2 max-h-64 overflow-y-auto" }, matches.map((match, index) =>
      React.createElement("li", { key: index, className: "rounded-lg bg-white border border-slate-200 p-2 text-[11.5px] text-slate-700" },
        React.createElement("p", { className: "font-medium break-words" }, match.text),
        React.createElement("p", null, `Current: ${match.currentCategory} · Proposed: ${match.proposedCategory}`),
        match.higherPriority && React.createElement("p", { className: "text-amber-700" }, `An earlier rule may take priority: ${match.higherPriority}.`),
        match.overriddenBy && React.createElement("p", { className: "text-amber-700" }, `A later advanced rule may override this: ${match.overriddenBy}.`)
      ))) : React.createElement("p", { className: "text-[12px] text-slate-500 mt-2" }, "No matches in this bounded sample."));
}
