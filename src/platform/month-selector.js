import React, { useMemo } from "react";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthSelector({ months, value, onChange, label = "Month" }) {
  const keys = useMemo(() => [...new Set(months.filter(key => /^\d{4}-(0[1-9]|1[0-2])$/.test(key)))].sort(), [months]);
  const selected = keys.includes(value) ? value : keys.at(-1);
  if (!selected) return null;
  const year = selected.slice(0, 4);
  const years = [...new Set(keys.map(key => key.slice(0, 4)))].reverse();
  const yearMonths = keys.filter(key => key.startsWith(year + "-"));
  const index = keys.indexOf(selected);
  const cls = "min-h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-[13px] text-slate-700 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";
  return React.createElement("div", { className: "inline-flex flex-wrap items-center gap-1.5", role: "group", "aria-label": label },
    React.createElement("button", { type: "button", className: cls, "aria-label": `Previous ${label.toLowerCase()}`, disabled: index === 0, onClick: () => onChange(keys[index - 1]) }, "←"),
    React.createElement("select", { className: cls, "aria-label": `${label} year`, value: year, onChange: event => { const matches = keys.filter(key => key.startsWith(event.target.value + "-")); onChange(matches.find(key => key.slice(5) === selected.slice(5)) || matches.at(-1)); } }, years.map(item => React.createElement("option", { key: item, value: item }, item))),
    React.createElement("select", { className: cls, "aria-label": `${label} month`, value: selected, onChange: event => onChange(event.target.value) }, yearMonths.map(key => React.createElement("option", { key, value: key }, monthNames[Number(key.slice(5)) - 1]))),
    React.createElement("button", { type: "button", className: cls, "aria-label": `Next ${label.toLowerCase()}`, disabled: index === keys.length - 1, onClick: () => onChange(keys[index + 1]) }, "→"));
}
