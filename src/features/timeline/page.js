import React, { useMemo, useState } from "react";
import { buildTimeline, monthDays, shiftMonth } from "./calculations.js";

export function createTimelinePage({ Card, dtBuildInstances, formatCurrency, formatDateDisplay, liabilityEffectivePayment, todayYMD }) {
  return function TimelinePage({ transactions, settings, onGoTo }) {
    const today = todayYMD();
    const [month, setMonth] = useState(today.slice(0, 7));
    const [selectedDay, setSelectedDay] = useState(null);
    const [view, setView] = useState("month");
    const [filter, setFilter] = useState("all");
    const [agendaLimit, setAgendaLimit] = useState(100);
    const dateInstances = useMemo(() => dtBuildInstances(settings.datesToRemember || [], `${month}-15`), [settings.datesToRemember, month]);
    const result = useMemo(() => buildTimeline({ month, today, transactions, settings, dateInstances, liabilityPayment: liabilityEffectivePayment }), [month, today, transactions, settings, dateInstances]);
    const days = useMemo(() => monthDays(month), [month]);
    const firstOffset = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).getDay();
    const displayed = useMemo(() => result.events.filter(event => filter === "all" || (filter === "recorded") === event.id.startsWith("transaction:")), [result.events, filter]);
    const byDay = useMemo(() => { const map = new Map(days.map(day => [day, { events: [], net: 0, recorded: 0, planned: 0 }])); for (const event of displayed) { const day = map.get(event.date); if (!day) continue; day.events.push(event); if (event.id.startsWith("transaction:")) { day.recorded++; day.net += event.netAmount || 0; } else day.planned++; } return map; }, [days, displayed]);
    const shown = selectedDay && selectedDay.startsWith(month) ? byDay.get(selectedDay)?.events || [] : displayed;
    const selectedSummary = selectedDay?.startsWith(month) ? byDay.get(selectedDay) : null;
    const label = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const buttonClass = "min-h-11 px-3 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 hover:border-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600";
    return React.createElement("div", { className: "p-4 md:p-8 pb-28 max-w-6xl mx-auto space-y-4" },
      React.createElement("header", null, React.createElement("h1", { className: "text-2xl font-semibold text-slate-800" }, "Financial Timeline"), React.createElement("p", { className: "text-[13px] text-slate-500 mt-1" }, "See recorded transactions alongside upcoming dates and plans. Calendar selection never records a payment.")),
      React.createElement(Card, { className: "p-4" },
        React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement("button", { type: "button", className: buttonClass, "aria-label": "Previous month", onClick: () => { setMonth(shiftMonth(month, -1)); setSelectedDay(null); } }, "←"),
            React.createElement("h2", { className: "min-w-36 text-center text-[15px] font-semibold text-slate-800" }, label),
            React.createElement("button", { type: "button", className: buttonClass, "aria-label": "Next month", onClick: () => { setMonth(shiftMonth(month, 1)); setSelectedDay(null); } }, "→"), month !== today.slice(0, 7) && React.createElement("button", { type: "button", className: buttonClass, onClick: () => { setMonth(today.slice(0, 7)); setSelectedDay(null); } }, "Current month")),
          React.createElement("div", { className: "flex gap-2" }, ["month", "agenda"].map(option => React.createElement("button", { key: option, type: "button", className: `${buttonClass} ${view === option ? "!bg-indigo-50 !border-indigo-300 !text-indigo-700" : ""}`, "aria-pressed": view === option, onClick: () => setView(option) }, option === "month" ? "Month" : "Agenda")))
        ),
        React.createElement("div", { className: "flex flex-wrap items-center gap-2 mt-3", "aria-label": "Timeline activity filter" }, [["all", "All activity"], ["recorded", "Recorded"], ["planned", "Planned"]].map(([id, title]) => React.createElement("button", { key: id, type: "button", className: `${buttonClass} ${filter === id ? "!bg-indigo-50 !border-indigo-300 !text-indigo-700" : ""}`, "aria-pressed": filter === id, onClick: () => { setFilter(id); setAgendaLimit(100); } }, title))),
        React.createElement("div", { className: "mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2", "aria-label": "Monthly timeline summary" }, [["Recorded transactions", String(result.transactionCount)], ["Recorded spending", formatCurrency(result.recordedOutgoing)], ["Recorded income", formatCurrency(result.recordedIncome)], ["Upcoming outgoing", formatCurrency(result.outgoing)]].map(([title, value]) => React.createElement("div", { key: title, className: "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" }, React.createElement("p", { className: "text-[11px] text-slate-500" }, title), React.createElement("p", { className: "text-[15px] font-semibold text-slate-800 krn-amount" }, value)))),
        React.createElement("p", { className: "text-[12px] text-slate-500 mt-3" }, `Expected income: ${formatCurrency(result.expectedIncome)}. Matching saved obligations on the same date are counted once. Recorded payments are excluded from projections.`),
        result.spendingCategories.length > 0 && React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3", "aria-label": "Top recorded spending categories" }, React.createElement("div", { className: "flex items-center justify-between gap-2" }, React.createElement("h3", { className: "text-[13px] font-semibold text-slate-700" }, "Where recorded spending went"), React.createElement("button", { type: "button", className: "text-[12px] text-indigo-700 underline", onClick: () => onGoTo("transactions") }, "See transactions")), React.createElement("div", { className: "mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" }, result.spendingCategories.map(item => React.createElement("div", { key: item.category, className: "rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 min-w-0" }, React.createElement("p", { className: "text-[11px] text-slate-500 truncate", title: item.category }, item.category), React.createElement("p", { className: "krn-amount text-[13px] font-semibold text-slate-800", tabIndex: 0 }, formatCurrency(item.amount))))))
      ),
      view === "month" && React.createElement(Card, { className: "p-3 sm:p-4 overflow-x-auto" },
        React.createElement("div", { className: "grid grid-cols-7 gap-1 min-w-0" },
          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => React.createElement("span", { key: day, className: "text-center text-[11px] font-semibold text-slate-500 py-1" }, day)),
          ...Array.from({ length: firstOffset }, (_, index) => React.createElement("span", { key: `blank-${index}` })),
          ...days.map(day => React.createElement("button", { key: day, type: "button", onClick: () => { setSelectedDay(day); setAgendaLimit(100); }, "aria-label": `${formatDateDisplay(day)}, ${byDay.get(day).events.length} timeline items${byDay.get(day).recorded ? `, recorded net ${formatCurrency(byDay.get(day).net)}` : ""}`, "aria-pressed": selectedDay === day, className: `min-w-0 min-h-14 sm:min-h-20 rounded-lg border p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${selectedDay === day ? "border-indigo-400 bg-indigo-50" : "border-slate-100 bg-white hover:bg-slate-50"}` },
            React.createElement("span", { className: "block text-[11px] font-semibold text-slate-700" }, Number(day.slice(-2))),
            byDay.get(day).events.length > 0 && React.createElement("span", { className: "block text-[10px] text-indigo-700 truncate" }, `${byDay.get(day).recorded} recorded · ${byDay.get(day).planned} planned`),
            byDay.get(day).recorded > 0 && React.createElement("span", { className: "krn-amount block text-[10px] font-semibold text-slate-700 truncate", tabIndex: 0 }, `Net ${formatCurrency(byDay.get(day).net)}`))))),
      React.createElement(Card, { className: "p-4" },
        React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3" }, React.createElement("h2", { className: "text-[15px] font-semibold text-slate-800" }, selectedDay && selectedDay.startsWith(month) ? formatDateDisplay(selectedDay) : `${label} agenda`), selectedDay && React.createElement("button", { type: "button", className: "text-[12px] text-indigo-700 underline", onClick: () => setSelectedDay(null) }, "Show whole month")),
        selectedSummary && React.createElement("p", { className: "mb-3 text-[12px] text-slate-600", role: "status" }, `${selectedSummary.recorded} recorded · ${selectedSummary.planned} planned`, selectedSummary.recorded ? ` · Net recorded ${formatCurrency(selectedSummary.net)}` : ""),
        shown.length ? React.createElement("ul", { className: "space-y-2" }, shown.slice(0, agendaLimit).map(event => React.createElement("li", { key: event.id, className: "rounded-xl border border-slate-200 px-3 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2" },
          React.createElement("div", { className: "min-w-0" }, React.createElement("p", { className: "text-[13px] font-semibold text-slate-800 break-words" }, event.name), React.createElement("p", { className: "text-[12px] text-slate-600" }, formatDateDisplay(event.date), " · ", event.status === "recorded" && !event.id.startsWith("transaction:") ? "linked to transaction" : event.status, event.amount != null && React.createElement("span", null, " · ", React.createElement("span", { className: "krn-amount inline-block", tabIndex: 0 }, formatCurrency(event.amount)))), React.createElement("p", { className: "text-[11.5px] text-slate-500" }, event.detail, !event.id.startsWith("transaction:") && !event.counted && event.status !== "recorded" && event.amount != null ? " This obligation is already represented in the projected total." : "")),
          React.createElement("button", { type: "button", className: buttonClass, onClick: () => onGoTo(event.tab) }, `Open ${event.tab}`)
        ))) : React.createElement("p", { className: "text-[13px] text-slate-500" }, "No matching activity for this selection."), shown.length > agendaLimit && React.createElement("button", { type: "button", className: `${buttonClass} mt-3`, onClick: () => setAgendaLimit(limit => limit + 100) }, `Show more · ${shown.length - agendaLimit} remaining`))
    );
  };
}
