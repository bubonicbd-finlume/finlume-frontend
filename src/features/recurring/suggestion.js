import React from "react";

export function createSuggestionCard({ Button, Card, formatCurrency, formatDateDisplay }) {
  function SuggestionCard({ c, onKeep, onIgnore, busy = false, saving = false, error = "" }) {
    return React.createElement(Card, { interactive: true, className: "p-4 flex flex-col gap-2.5" },
      React.createElement("div", { className: "flex items-start justify-between" },
        React.createElement("div", null,
          React.createElement("p", { className: "text-[14px] font-semibold text-slate-800 capitalize" }, c.displayMerchant),
          React.createElement("p", { className: "text-[12px] text-slate-500 capitalize" }, c.category, " · ", c.cadence)),
        React.createElement("span", { className: `text-[11px] font-medium px-2 py-0.5 rounded-full ${c.confidence === "high" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}` },
          c.confidence === "high" ? `${c.confidenceScore}% match` : `${c.confidenceScore}% possible`)),
      React.createElement("div", { className: "grid grid-cols-3 gap-2 text-[12px] text-slate-500" },
        [["Occurrences", c.occurrences], ["Avg charge", formatCurrency(c.avgAmount)], ["Monthly equiv.", formatCurrency(c.monthlyEquivalent)]].map(([label, value]) =>
          React.createElement("div", { key: label },
            React.createElement("p", { className: "text-slate-400" }, label),
            React.createElement("p", { className: "text-slate-700 font-medium" }, value)))),
      React.createElement("p", { className: "text-[11px] text-slate-400" }, c.matchReason),
      React.createElement("p", { className: "text-[12px] text-slate-500" }, "Next expected: ",
        React.createElement("span", { className: "text-slate-700 font-medium" }, formatDateDisplay(c.nextDate))),
      React.createElement("div", { className: "flex gap-2 pt-1" },
        React.createElement(Button, { variant: "primary", className: "flex-1", onClick: () => onKeep(c), disabled: busy }, saving ? "Saving…" : "Keep"),
        React.createElement(Button, { variant: "secondary", className: "flex-1", onClick: () => onIgnore(c), disabled: busy }, "Ignore")),
      React.createElement("p", { className: "text-[10.5px] text-slate-400 -mt-1" },
        "Keeping this also auto-categorizes future ", c.displayMerchant, " transactions as ", c.category, "."),
      error && React.createElement("p", { role: "alert", className: "text-[12px] text-rose-700" }, error));
  }
  return SuggestionCard;
}