import React from "react";
import { LOCALES, localizedDate, localizedMoney } from "../../platform/locale.js";

export function LocaleSettings({ settings, onSave, busy, Card }) {
  const locale = settings.locale || "en-IN";
  return React.createElement(Card, { className: "p-5" },
    React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700 mb-2" }, "Language & regional formatting"),
    React.createElement("label", { className: "block text-[12px] text-slate-600" }, "Number and date format",
      React.createElement("select", { value: locale, disabled: busy, onChange: event => onSave({ locale: event.target.value }), className: "block mt-2 h-11 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3" }, LOCALES.map(item => React.createElement("option", { key: item.id, value: item.id }, item.label)))),
    React.createElement("p", { className: "text-[12px] text-slate-500 mt-2" }, `Example: ${localizedMoney(12345.67, settings.currency || "INR", locale)} · ${localizedDate("2026-10-26", locale)}`),
    React.createElement("p", { className: "text-[11px] text-slate-400 mt-1" }, "This changes display only. Saved amounts are not converted between currencies; English interface text remains in use."));
}
