import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { financeNavGroup } from "./finance-navigation.js";

export function GroupedMobileNav({ active, onNavigate, tabs }) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef(null);
  const dialogRef = useRef(null);
  const primaryIds = ["dashboard", "transactions", "timeline", "settings"];
  const primary = primaryIds.map(id => tabs.find(tab => tab.id === id)).filter(Boolean);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.querySelector("button")?.focus();
    function keydown(event) {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); setTimeout(() => moreRef.current?.focus(), 0); }
      if (event.key !== "Tab" || !dialog) return;
      const buttons = [...dialog.querySelectorAll("button:not([disabled])")];
      if (!buttons.length) return;
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [open]);
  function choose(id) { setOpen(false); onNavigate(id); setTimeout(() => document.getElementById("main-content")?.focus(), 0); }
  const navButton = tab => React.createElement("button", { key: tab.id, type: "button", onClick: () => choose(tab.id), "aria-label": tab.label, "aria-current": active === tab.id ? "page" : undefined, className: `fin-mobile-nav-btn-${tab.id} min-h-14 min-w-0 flex-1 flex flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium ${active === tab.id ? "text-white" : "text-indigo-200/80"}` }, React.createElement(tab.icon, { size: 18 }), React.createElement("span", { className: "block w-full truncate" }, ({ dashboard: "Home", transactions: "Entries", timeline: "Timeline", settings: "Settings" })[tab.id] || tab.label));
  const groups = ["Overview", "Activity", "Planning", "Account"];
  return ReactDOM.createPortal(React.createElement(React.Fragment, null,
    open && React.createElement("div", { className: "fixed inset-0 z-40 md:hidden", style: { backgroundColor: "rgba(9, 6, 26, 0.82)" }, onClick: () => { setOpen(false); moreRef.current?.focus(); } },
      React.createElement("div", { ref: dialogRef, role: "dialog", "aria-modal": "true", "aria-label": "More Finance pages", className: "fin-mobile-more-dialog absolute bottom-16 inset-x-3 max-h-[min(75vh,600px)] overflow-y-auto rounded-2xl p-4 shadow-2xl", style: { backgroundColor: "#211848", color: "#fff" }, onClick: event => event.stopPropagation() },
        React.createElement("div", { className: "fin-mobile-more-header flex justify-between items-center mb-3" }, React.createElement("h2", { className: "text-[15px] font-semibold" }, "All Finance pages"), React.createElement("button", { type: "button", onClick: () => { setOpen(false); moreRef.current?.focus(); }, className: "min-h-11 px-3 font-semibold" }, "Close")),
        groups.map(group => React.createElement("section", { key: group, className: "mb-3" }, React.createElement("h3", { className: "text-[11px] uppercase tracking-wide font-semibold mb-1", style: { color: "#c5bff5" } }, group), React.createElement("div", { className: "grid grid-cols-2 gap-2" }, tabs.filter(tab => !tab.hidden && financeNavGroup(tab.id) === group).map(tab => React.createElement("button", { key: tab.id, type: "button", onClick: () => choose(tab.id), "aria-current": active === tab.id ? "page" : undefined, className: "min-h-11 rounded-xl border px-3 text-left text-[12px] font-medium", style: { borderColor: active === tab.id ? "#a99df7" : "#564b81", backgroundColor: active === tab.id ? "#514493" : "#30265c", color: "#fff" } }, tab.label))))))),
    React.createElement("nav", { "aria-label": "Main (mobile)", className: "fin-mobile-nav lg-sidebar md:hidden fixed bottom-0 inset-x-0 z-50 flex pb-[env(safe-area-inset-bottom)]" },
      primary.map(navButton), React.createElement("button", { ref: moreRef, type: "button", onClick: () => setOpen(true), "aria-expanded": open, "aria-haspopup": "dialog", className: `min-h-14 min-w-0 flex-1 text-[11px] font-medium ${primaryIds.includes(active) ? "text-indigo-200/80" : "text-white"}` }, "More"))
  ), document.body);
}
