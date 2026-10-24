import React, { useEffect, useState } from "react";
import { inspectDataHealth } from "./calculations.js";

export function createDataHealthPage({ Card }) {
  return function DataHealthPage({ onReadHealthData, onGoTo, onReviewTransaction, importIssue, saveError }) {
    const [state, setState] = useState({ status: "loading" });
    const [retry, setRetry] = useState(0);
    useEffect(() => {
      let active = true;
      setState({ status: "loading" });
      Promise.resolve().then(onReadHealthData).then(snapshot => { if (active) setState({ status: "ready", findings: inspectDataHealth(snapshot), checkedAt: new Date() }); })
        .catch(error => { if (active) setState({ status: "failed", message: error?.message || "The cloud data could not be read." }); });
      return () => { active = false; };
    }, [onReadHealthData, retry]);
    const sessionFindings = [
      ...(importIssue ? [{ key: "import", title: "Import outcome needs review", detail: "An import in this browser session was incomplete or could not be confirmed. Check Transactions before retrying the file.", tab: "transactions", severity: "warning", preview: { affected: "The current browser session's import attempt", proposed: "Compare the source statement with confirmed saved transactions before retrying the import.", preserved: "No import is retried from this page." } }] : []),
      ...(saveError ? [{ key: "save", title: "A save was not confirmed", detail: saveError, tab: "settings", severity: "error", preview: { affected: "The last reported save attempt in this browser session", proposed: "Refresh the affected screen and compare with confirmed cloud values before retrying.", preserved: "No save is retried from this page." } }] : [])
    ];
    const findings = state.status === "ready" ? [...sessionFindings, ...state.findings] : sessionFindings;
    return React.createElement("div", { className: "p-4 md:p-8 pb-28 max-w-5xl mx-auto space-y-4" },
      React.createElement("header", null, React.createElement("button", { type: "button", className: "min-h-11 text-[12px] font-semibold text-indigo-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600", onClick: () => onGoTo("settings") }, "← Settings"), React.createElement("h1", { className: "text-2xl font-semibold text-slate-800" }, "Data Health Centre"), React.createElement("p", { className: "text-[13px] text-slate-500 mt-1" }, "Review possible problems before changing saved data. Nothing on this page repairs or removes records automatically.")),
      React.createElement(Card, { className: "p-4" },
        state.status === "loading" ? React.createElement("p", { role: "status", className: "text-[13px] text-slate-600" }, "Checking saved cloud data…") :
        state.status === "failed" ? React.createElement("div", { role: "alert", className: "text-[13px] text-rose-700" }, "Could not confirm cloud data: ", state.message, React.createElement("button", { type: "button", className: "ml-2 min-h-11 px-2 underline font-semibold", onClick: () => setRetry(n => n + 1) }, "Retry")) :
        React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" }, React.createElement("p", { role: "status", className: "text-[12px] text-slate-600" }, "Cloud records read at ", state.checkedAt.toLocaleString(), ". Findings are a preview of that read."), React.createElement("button", { type: "button", className: "min-h-11 px-3 rounded-xl border border-indigo-200 text-indigo-700 text-[12px] font-semibold", onClick: () => setRetry(n => n + 1) }, "Refresh check"))),
      state.status !== "ready" && !sessionFindings.length ? null : React.createElement(Card, { className: "p-4" },
        React.createElement("h2", { className: "text-[15px] font-semibold text-slate-800 mb-3" }, "Findings"),
        findings.length ? React.createElement("ul", { className: "space-y-2" }, findings.map(item => React.createElement("li", { key: item.key, className: `rounded-xl border p-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 ${item.severity === "error" ? "border-rose-200 bg-rose-50" : item.severity === "warning" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}` },
          React.createElement("div", { className: "min-w-0" }, React.createElement("p", { className: "text-[13px] font-semibold text-slate-800" }, item.title), React.createElement("p", { className: "text-[12px] text-slate-600 break-words" }, item.detail), item.preview && React.createElement("details", { className: "mt-2 text-[12px] text-slate-700" }, React.createElement("summary", { className: "cursor-pointer min-h-11 inline-flex items-center font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, "Preview review steps"), React.createElement("dl", { className: "space-y-1 rounded-lg border border-slate-200 bg-white p-3 break-words" }, React.createElement("dt", { className: "font-semibold" }, "Affected"), React.createElement("dd", null, item.preview.affected), React.createElement("dt", { className: "font-semibold" }, "Proposed next step"), React.createElement("dd", null, item.preview.proposed), React.createElement("dt", { className: "font-semibold" }, "Preserved"), React.createElement("dd", null, item.preview.preserved))), item.targets?.length > 0 && onReviewTransaction && React.createElement("div", { className: "mt-2 flex flex-wrap gap-2" }, item.targets.map(target => React.createElement("button", { key: target.id, type: "button", className: "min-h-11 px-3 rounded-xl border border-indigo-200 bg-white text-[12px] font-semibold text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600", onClick: () => onReviewTransaction(target.id) }, `Review ${target.label}`)))),
          React.createElement("button", { type: "button", className: "self-start min-h-11 px-3 rounded-xl bg-white border border-slate-200 text-[12px] font-semibold text-indigo-700 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600", onClick: () => onGoTo(item.tab) }, `Review ${item.tab}`)
        ))) : React.createElement("p", { className: "text-[13px] text-slate-500" }, "No data issues found in the confirmed cloud read."))
    );
  };
}
