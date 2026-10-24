import React, { useEffect, useState } from "react";

export const FINLUME_SYNC_EVENT = "finlume:sync-status";
export const financeLastSaveKey = userId => `finlume:last-finance-save:${userId}`;

export function reduceFinanceSyncStatus(state, event) {
  if (event.status === "saving") return { ...state, pending: state.pending + 1, status: "saving", message: "" };
  if (event.status === "saved") {
    const pending = Math.max(0, state.pending - 1);
    return { pending, status: state.status === "error" ? "error" : pending ? "saving" : "saved", at: event.at || state.at, message: state.status === "error" ? state.message : "" };
  }
  if (event.status === "error") return { ...state, pending: Math.max(0, state.pending - 1), status: "error", message: event.message || "Save failed" };
  return state;
}

function readLast(userId) { try { return window.localStorage.getItem(financeLastSaveKey(userId)); } catch { return null; } }

export function useFinanceSyncStatus(userId) {
  const [state, setState] = useState(() => ({ status: "idle", pending: 0, at: readLast(userId), message: "" }));
  useEffect(() => {
    setState({ status: "idle", pending: 0, at: readLast(userId), message: "" });
    const listen = event => { if (event.detail?.userId === userId) setState(current => reduceFinanceSyncStatus(current, event.detail)); };
    window.addEventListener(FINLUME_SYNC_EVENT, listen);
    return () => window.removeEventListener(FINLUME_SYNC_EVENT, listen);
  }, [userId]);
  return state;
}

export function FinanceSyncStatus({ userId }) {
  const state = useFinanceSyncStatus(userId);
  if (state.status !== "saving" && state.status !== "error") return null;
  const label = state.status === "saving" ? "Saving Finance data…" : "Finance save failed";
  return React.createElement("div", { role: state.status === "error" ? "alert" : "status", "aria-live": state.status === "error" ? "assertive" : "polite", className: `px-4 md:px-8 py-2 text-[12px] border-b ${state.status === "error" ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-indigo-50 border-indigo-100 text-indigo-800"}` },
    React.createElement("span", { className: "font-semibold" }, label),
    state.status === "error" && React.createElement("span", { className: "ml-2" }, state.message, " Check your changes before refreshing the page.")
  );
}
