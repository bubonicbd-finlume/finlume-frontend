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
    const displayed = useMemo(() => result.events.filter(event => filter === "all" || (filter === "recorded") === (event.id.startsWith("transaction:") || event.status === "recorded")), [result.events, filter]);
    const byDay = useMemo(() => {
      const map = new Map(days.map(day => [day, { events: [], net: 0, spending: 0, recorded: 0, planned: 0 }]));
      for (const event of displayed) {
        const day = map.get(event.date);
        if (!day) continue;
        day.events.push(event);
        if (event.id.startsWith("transaction:")) { day.recorded++; day.net += event.netAmount || 0; }
        else day.planned++;
      }
      // The heatmap always reflects actual transactions, even when the agenda is filtered to planned items.
      for (const event of result.events) {
        if (!event.id.startsWith("transaction:")) continue;
        const day = map.get(event.date);
        if (!day) continue;
        if (event.status === "refund") day.spending -= Number(event.amount) || 0;
        else if (event.status === "recorded" && event.direction === "outgoing") day.spending += Number(event.amount) || 0;
      }
      return map;
    }, [days, displayed, result.events]);
    const spendingGrades = useMemo(() => {
      const ranked = [...byDay.entries()].filter(([, value]) => value.spending > 0).sort((a, b) => a[1].spending - b[1].spending || a[0].localeCompare(b[0]));
      const levels = new Map();
      if (!ranked.length) return { levels, lowest: null, median: null, highest: null };
      const values = ranked.map(([, value]) => value.spending);
      const quantile = ratio => values[Math.floor((values.length - 1) * ratio)];
      const medianIndex = Math.floor((values.length - 1) / 2);
      const medianAmount = values[medianIndex];
      const medianDay = ranked[medianIndex][0];
      const lowest = ranked[0], highest = ranked.at(-1);
      const cuts = [0.2, 0.4, 0.6, 0.8].map(quantile);
      for (const [day, value] of ranked) {
        const labels = [];
        if (value.spending === lowest[1].spending) labels.push("Lowest");
        if (day === medianDay) labels.push("Median");
        if (value.spending === highest[1].spending) labels.push("Highest");
        let level = 1;
        for (const cut of cuts) if (value.spending > cut) level++;
        levels.set(day, { level: Math.min(5, level), labels, amount: value.spending });
      }
      return { levels, lowest: { day: lowest[0], amount: lowest[1].spending }, median: { day: medianDay, amount: medianAmount }, highest: { day: highest[0], amount: highest[1].spending } };
    }, [byDay]);
    const weekDays = useMemo(() => {
      const anchor = selectedDay?.startsWith(month) ? selectedDay : today.startsWith(month) ? today : days[0];
      const anchorIndex = Math.max(0, days.indexOf(anchor));
      const start = Math.max(0, anchorIndex - new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1, Number(anchor.slice(8, 10))).getDay());
      return days.slice(start, start + 7);
    }, [days, month, selectedDay, today]);
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
          React.createElement("div", { className: "flex gap-2" }, ["month", "week", "agenda"].map(option => React.createElement("button", { key: option, type: "button", className: `${buttonClass} ${view === option ? "!bg-indigo-50 !border-indigo-300 !text-indigo-700" : ""}`, "aria-pressed": view === option, onClick: () => setView(option) }, option === "month" ? "Month" : option === "week" ? "Week" : "Agenda")))
        ),
        React.createElement("div", { className: "flex flex-wrap items-center gap-2 mt-3", "aria-label": "Timeline activity filter" }, [["all", "All activity"], ["recorded", "Recorded"], ["planned", "Planned"]].map(([id, title]) => React.createElement("button", { key: id, type: "button", className: `${buttonClass} ${filter === id ? "!bg-indigo-50 !border-indigo-300 !text-indigo-700" : ""}`, "aria-pressed": filter === id, onClick: () => { setFilter(id); setAgendaLimit(100); } }, title))),
        React.createElement("div", { className: "mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2", "aria-label": "Monthly timeline summary" }, [["Recorded transactions", String(result.transactionCount)], ["Recorded spending", formatCurrency(result.recordedOutgoing)], ["Recorded income", formatCurrency(result.recordedIncome)], ["Upcoming outgoing", formatCurrency(result.outgoing)]].map(([title, value]) => React.createElement("div", { key: title, className: "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2" }, React.createElement("p", { className: "text-[11px] text-slate-500" }, title), React.createElement("p", { className: "text-[15px] font-semibold text-slate-800 krn-amount" }, value)))),
        React.createElement("p", { className: "text-[12px] text-slate-500 mt-3" }, `Expected income: ${formatCurrency(result.expectedIncome)}. Matching saved obligations on the same date are counted once. Recorded payments are excluded from projections.`),
        result.spendingCategories.length > 0 && React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3", "aria-label": "Top recorded spending categories" }, React.createElement("div", { className: "flex items-center justify-between gap-2" }, React.createElement("h3", { className: "text-[13px] font-semibold text-slate-700" }, "Where recorded spending went"), React.createElement("button", { type: "button", className: "text-[12px] text-indigo-700 underline", onClick: () => onGoTo("transactions") }, "See transactions")), React.createElement("div", { className: "mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" }, result.spendingCategories.map(item => React.createElement("div", { key: item.category, className: "rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 min-w-0" }, React.createElement("p", { className: "text-[11px] text-slate-500 truncate", title: item.category }, item.category), React.createElement("p", { className: "krn-amount text-[13px] font-semibold text-slate-800", tabIndex: 0 }, formatCurrency(item.amount))))))
      ),
      view === "month" && React.createElement(Card, { className: "p-3 sm:p-4 overflow-x-auto" },
        spendingGrades.lowest && React.createElement("div", { className: "timeline-spending-legend", "aria-label": "Daily recorded spending colour scale" }, React.createElement("span", { className: "text-[11px] font-medium text-slate-500" }, "Recorded spending"), [["Lowest", spendingGrades.lowest], ["Median", spendingGrades.median], ["Highest", spendingGrades.highest]].map(([label, item]) => React.createElement("span", { key: label, className: "timeline-spending-legend-item" }, React.createElement("span", { className: "timeline-spending-swatch timeline-spending-" + spendingGrades.levels.get(item.day).level, "aria-hidden": "true" }), React.createElement("span", null, label + " · " + formatCurrency(item.amount) + " · " + formatDateDisplay(item.day))))),
        React.createElement("div", { className: "grid grid-cols-7 gap-1 min-w-0" },
          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => React.createElement("span", { key: day, className: "text-center text-[11px] font-semibold text-slate-500 py-1" }, day)),
          ...Array.from({ length: firstOffset }, (_, index) => React.createElement("span", { key: "blank-" + index })),
          ...days.map(day => {
            const dayData = byDay.get(day), grade = spendingGrades.levels.get(day);
            const shortRank = grade ? grade.labels.map(label => ({ Lowest: "Low", Median: "Med", Highest: "High" })[label]).join("/") : "";
            const neutral = selectedDay === day ? "border-indigo-400 bg-indigo-50" : "border-slate-100 bg-white hover:bg-slate-50";
            const gradeDescription = grade ? ", " + grade.labels.join(", ") + " recorded spending day, " + formatCurrency(grade.amount) + " spent" : dayData.spending < 0 ? ", net refund day" : ", no net recorded spending";
            return React.createElement("button", { key: day, type: "button", onClick: () => { setSelectedDay(day); setAgendaLimit(100); }, title: formatDateDisplay(day) + (grade ? " · " + formatCurrency(grade.amount) + " recorded spending · " + grade.labels.join(", ") + " of the month" : " · No net recorded spending"), "aria-label": formatDateDisplay(day) + ", " + dayData.events.length + " timeline items" + (dayData.recorded ? ", recorded net " + formatCurrency(dayData.net) : "") + gradeDescription, "aria-pressed": selectedDay === day, className: "min-w-0 min-h-14 sm:min-h-20 rounded-lg border p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 " + (grade ? "timeline-spending-" + grade.level : neutral) + (selectedDay === day ? " timeline-spending-selected" : "") },
              React.createElement("span", { className: "flex items-center justify-between gap-1" }, React.createElement("span", { className: "text-[11px] font-semibold text-slate-700" }, Number(day.slice(-2))), shortRank && React.createElement("span", { className: "timeline-spending-rank", "aria-hidden": "true" }, shortRank)),
              dayData.events.length > 0 && React.createElement("span", { className: "block text-[10px] text-indigo-700 truncate" }, dayData.recorded + " recorded · " + dayData.planned + " planned"),
              dayData.spending > 0 && React.createElement("span", { className: "krn-amount block text-[10px] font-semibold text-slate-700 truncate", tabIndex: 0 }, "Spent " + formatCurrency(dayData.spending)),
              dayData.recorded > 0 && dayData.spending <= 0 && React.createElement("span", { className: "krn-amount block text-[10px] font-semibold text-slate-700 truncate", tabIndex: 0 }, "Net " + formatCurrency(dayData.net)));
          })
        )),
      view === "week" && React.createElement(Card, { className: "p-3 sm:p-4 overflow-x-auto" },
        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-7 gap-2 min-w-0" }, weekDays.map(day => {
          const dayData = byDay.get(day), grade = spendingGrades.levels.get(day);
          const shortRank = grade ? grade.labels.map(label => ({ Lowest: "Low", Median: "Med", Highest: "High" })[label]).join("/") : "";
          const neutral = selectedDay === day ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50";
          return React.createElement("button", { key: day, type: "button", onClick: () => { setSelectedDay(day); setAgendaLimit(100); }, "aria-pressed": selectedDay === day, title: formatDateDisplay(day) + (grade ? " · " + formatCurrency(grade.amount) + " recorded spending · " + grade.labels.join(", ") : " · No net recorded spending"), className: "min-h-24 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 " + (grade ? "timeline-spending-" + grade.level : neutral) + (selectedDay === day ? " timeline-spending-selected" : "") },
            React.createElement("span", { className: "flex items-center justify-between gap-1 text-[11px] font-medium text-slate-500" }, new Date(day + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }), shortRank && React.createElement("span", { className: "timeline-spending-rank" }, shortRank)),
            React.createElement("span", { className: "block text-[16px] font-semibold text-slate-800" }, Number(day.slice(-2))),
            React.createElement("span", { className: "mt-2 block text-[10.5px] text-indigo-700" }, dayData.recorded + " recorded · " + dayData.planned + " planned"),
            dayData.spending > 0 && React.createElement("span", { className: "krn-amount mt-1 block text-[10px] font-semibold text-slate-700", tabIndex: 0 }, "Spent " + formatCurrency(dayData.spending)),
            dayData.recorded > 0 && dayData.spending <= 0 && React.createElement("span", { className: "krn-amount mt-1 block text-[10px] font-semibold text-slate-700", tabIndex: 0 }, "Net " + formatCurrency(dayData.net)));
        })) ),
      React.createElement(Card, { className: "p-4" },
        React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3" }, React.createElement("h2", { className: "text-[15px] font-semibold text-slate-800" }, selectedDay && selectedDay.startsWith(month) ? formatDateDisplay(selectedDay) : `${label} agenda`), selectedDay && React.createElement("button", { type: "button", className: "text-[12px] text-indigo-700 underline", onClick: () => setSelectedDay(null) }, "Show whole month")),
        selectedSummary && React.createElement("p", { className: "mb-3 text-[12px] text-slate-600", role: "status" }, `${selectedSummary.recorded} recorded · ${selectedSummary.planned} planned`, selectedSummary.recorded ? ` · Net recorded ${formatCurrency(selectedSummary.net)}` : ""),
        shown.length ? React.createElement("ul", { className: "space-y-2" }, shown.slice(0, agendaLimit).map(event => React.createElement("li", { key: event.id, className: "rounded-xl border border-slate-200 px-3 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2" },
          React.createElement("div", { className: "min-w-0" }, React.createElement("p", { className: "text-[13px] font-semibold text-slate-800 break-words" }, event.name), React.createElement("p", { className: "text-[12px] text-slate-600" }, formatDateDisplay(event.date), " · ", event.status === "recorded" && !event.id.startsWith("transaction:") ? "linked to transaction" : event.status, event.amount != null && React.createElement("span", null, " · ", React.createElement("span", { className: "krn-amount inline-block", tabIndex: 0 }, formatCurrency(event.amount)))), React.createElement("p", { className: "text-[11.5px] text-slate-500" }, event.detail, !event.id.startsWith("transaction:") && !event.counted && event.status !== "recorded" && event.amount != null ? " This obligation is already represented in the projected total." : "")),
          React.createElement("button", { type: "button", className: buttonClass, onClick: () => onGoTo(event.tab, event.entityId ? { entityId: event.entityId, source: "timeline" } : undefined) }, `Open ${event.tab}`)
        ))) : React.createElement("p", { className: "text-[13px] text-slate-500" }, "No matching activity for this selection."), shown.length > agendaLimit && React.createElement("button", { type: "button", className: `${buttonClass} mt-3`, onClick: () => setAgendaLimit(limit => limit + 100) }, `Show more · ${shown.length - agendaLimit} remaining`))
    );
  };
}
