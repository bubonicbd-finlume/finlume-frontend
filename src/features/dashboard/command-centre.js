import React, { useEffect, useState } from "react";
import { buildActionInbox } from "./action-inbox.js";
import { isInboxSnoozed, readInboxSnoozes, snoozeInboxItem, writeInboxSnoozes } from "./inbox-snooze.js";
import { readSplitInbox } from "./split-inbox.js";
import { groupInboxItems } from "./inbox-groups.js";
import { buildSetupSteps, setupGuideStorageKey } from "./setup-guide.js";

function snoozeStorage() { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } }

export function createDashboardCommandCentre(deps) {
const { ArrowDownRight, ArrowUpRight, Button, CalendarClock, Card, ChevronDown, CreditCard, DONUT_COLORS, EmptyState, INVESTMENT_CLASS_COLORS, LayoutDashboard, Modal, PeriodSelector, PiggyBank, ProgressBar, Receipt, Repeat, ShieldAlert, SlidersHorizontal, Sparkles, SummaryCard, Target, TrendingUp, Wallet, computeCombinedNetWorth, computeFinancials, computeInvestmentSummary, computeMonthlyInsight, detectRecurringCandidates, dtBuildInstances, formatCurrency, formatDateDisplay, hasSystemTag, isCategoryEssential, isSelfTransfer, isStaleAccount, liabilityEffectivePayment, monthKey, monthlyEquivalent, nowISO, todayYMD, upsertNetWorthSnapshot, useFlashColor, supabaseClient } = deps;
function DashboardCommandCentre({ userId, transactions, settings, onGoTo, onSaveSettings, onOpenSplit, onOpenImport, importIssue, fin, nw, savingsRate, periodTx }) {
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [hiddenInboxKeys, setHiddenInboxKeys] = useState([]);
  const [expandedInboxGroups, setExpandedInboxGroups] = useState([]);
  const [setupHidden, setSetupHidden] = useState(() => { try { return window.localStorage.getItem(setupGuideStorageKey(userId)) === "1"; } catch { return false; } });
  const [snoozes, setSnoozes] = useState(() => readInboxSnoozes(snoozeStorage(), userId));
  const [snoozeNow, setSnoozeNow] = useState(Date.now());
  const [snoozeError, setSnoozeError] = useState("");
  useEffect(() => { const timer = setInterval(() => setSnoozeNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const defaultOrder = ["netWorth", "income", "spending", "savingsRate", "debt", "recurring"];
  const savedOrder = Array.isArray(settings.dashboardCardOrder) ? settings.dashboardCardOrder : [];
  const order = [...savedOrder.filter(id => defaultOrder.includes(id)), ...defaultOrder.filter(id => !savedOrder.includes(id))];
  const hidden = Array.isArray(settings.dashboardHiddenCards) ? settings.dashboardHiddenCards : [];
  const liabilities = (settings.netWorthAccounts || []).filter(a => a.type === "liability" && (Number(a.balance) || 0) > 0);
  const debtTotal = liabilities.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  const debtMonthly = liabilities.reduce((sum, a) => sum + liabilityEffectivePayment(a), 0);
  const recurringMonthly = [...(settings.recurring || []).filter(r => r.active !== false), ...(settings.subscriptions || []).filter(s => s.active !== false)].reduce((sum, item) => sum + monthlyEquivalent(item.amount, item.cadence), 0);
  const today = todayYMD();
  const periodLabel = ({ "this-month": "this month", "last-month": "last month", "last-3-months": "last 3 months", "last-6-months": "last 6 months", "this-year": "this year", "all-time": "all time" })[settings.selectedPeriod] || "selected period";
  const inbox = buildActionInbox({ transactions, settings, today, dateInstances: typeof dtBuildInstances === "function" ? dtBuildInstances(settings.datesToRemember || [], today) : [], isSelfTransfer, isRefund: transaction => hasSystemTag(transaction, "Refund") });
  const [splitState, setSplitState] = useState({ status: "loading", items: [] });
  const [splitRetry, setSplitRetry] = useState(0);
  useEffect(() => {
    if (!supabaseClient) { setSplitState({ status: "unavailable", items: [] }); return; }
    let active = true;
    setSplitState({ status: "loading", items: [] });
    readSplitInbox(supabaseClient, today).then(items => { if (active) setSplitState({ status: "ready", items }); })
      .catch(error => { if (active) setSplitState({ status: "failed", items: [], error: error?.message || "Split could not be read." }); });
    return () => { active = false; };
  }, [today, splitRetry]);
  const allInboxItems = [...inbox, ...splitState.items, ...(importIssue ? [{ key: "import:session", title: "Statement import needs review", reason: "An import attempt in this browser session did not finish or could not be confirmed. Reopen the importer and check saved transactions before retrying.", kind: "unconfirmed", tab: "import" }] : [])].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const visibleInboxItems = allInboxItems.filter(item => !hiddenInboxKeys.includes(item.key) && !isInboxSnoozed(snoozes, item, snoozeNow));
  const inboxGroups = groupInboxItems(visibleInboxItems).filter(group => group.items.length);
  const setupSteps = buildSetupSteps(transactions, settings);
  const setupDone = setupSteps.filter(step => step.done).length;
  function toggleSetupHidden() { const next = !setupHidden; setSetupHidden(next); try { window.localStorage.setItem(setupGuideStorageKey(userId), next ? "1" : "0"); } catch {} }
  const snoozedCount = allInboxItems.filter(item => isInboxSnoozed(snoozes, item, snoozeNow)).length;
  function snoozeItem(item) {
    const next = snoozeInboxItem(snoozeStorage(), userId, snoozes, item);
    if (!next) { setSnoozeError("Could not save this snooze on this device. The item remains visible."); return; }
    setSnoozes(next);
    setSnoozeError("");
  }
  function restoreSnoozes() {
    if (!writeInboxSnoozes(snoozeStorage(), userId, [])) { setSnoozeError("Could not clear saved snoozes on this device. Try again."); return; }
    setSnoozes([]);
    setSnoozeError("");
  }
  const dashboardCalc = window.__FINLUME_FEATURES__.dashboard;
  const horizonYmd = dashboardCalc.addDays(today, 30);
  const datedPayments = [
    ...(settings.recurring || []).filter(r => r.active !== false && r.nextDate && r.nextDate >= today && r.nextDate <= horizonYmd && r.type !== "income").map(r => ({ id: `recurring-${r.id}`, name: r.name || r.merchant || "Recurring payment", date: r.nextDate, amount: Number(r.amount) || 0, kind: "Recurring", tab: "recurring" })),
    ...(settings.subscriptions || []).filter(s => s.active !== false && s.nextDate && s.nextDate >= today && s.nextDate <= horizonYmd).map(s => ({ id: `subscription-${s.id}`, name: s.name || "Subscription", date: s.nextDate, amount: Number(s.amount) || 0, kind: "Subscription", tab: "recurring" }))
  ];
  const loanPayments = liabilities.filter(a => Number(a.paymentDueDay) > 0).map(a => {
    const dueDate = dashboardCalc.nextMonthlyDueDate(a.paymentDueDay, today);
    return { id: `liability-${a.id}`, name: a.name || "Liability payment", date: dueDate, amount: liabilityEffectivePayment(a), kind: "Loan payment", tab: "liabilities" };
  }).filter(item => item.date <= horizonYmd);
  const upcomingPayments = [...datedPayments, ...loanPayments].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingTotal = upcomingPayments.reduce((sum, item) => sum + item.amount, 0);
  const maturities = liabilities.filter(a => a.endDate).map(a => ({ ...a, days: dashboardCalc.daysUntil(a.endDate, today) })).filter(a => a.days <= 90).sort((a, b) => a.days - b.days);
  const monthSummary = dashboardCalc.currentMonthSummary(transactions, today, { isSelfTransfer, isRefund: transaction => hasSystemTag(transaction, "Refund") });
  const { recordedMargin, spentByCategory: budgetSpent } = monthSummary;
  const needsReview = periodTx.filter(t => t.category === "Needs review").length;
  const budgetWarnings = dashboardCalc.findBudgetWarnings(settings.budgets || [], budgetSpent);
  const attention = [];
  if (maturities.length) attention.push({ id: "maturity", tone: maturities.some(a => a.days <= 30) ? "rose" : "amber", title: `${maturities.length} liabilit${maturities.length === 1 ? "y" : "ies"} nearing an end date`, detail: maturities[0].days < 0 ? `${maturities[0].name} is past its saved end date.` : `${maturities[0].name} ends in ${maturities[0].days} days.`, action: "Review liabilities", tab: "liabilities" });
  if (budgetWarnings.length) attention.push({ id: "budget", tone: budgetWarnings.some(b => (budgetSpent.get(b.category) || 0) >= Number(b.limit)) ? "rose" : "amber", title: `${budgetWarnings.length} budget${budgetWarnings.length === 1 ? "" : "s"} need attention`, detail: `${budgetWarnings[0].category} is at ${Math.round((budgetSpent.get(budgetWarnings[0].category) || 0) / (Number(budgetWarnings[0].limit) || 1) * 100)}% of its monthly limit.`, action: "Open budgets", tab: "budgets" });
  if (needsReview) attention.push({ id: "review", tone: "indigo", title: `${needsReview} transaction${needsReview === 1 ? " needs" : "s need"} categorising`, detail: "Reviewing these improves every dashboard calculation.", action: "Review transactions", tab: "transactions" });
  if (upcomingTotal > 0 && recordedMargin < upcomingTotal) attention.push({ id: "cash", tone: "amber", title: "Upcoming payments are higher than this month's recorded margin", detail: `${formatCurrency(upcomingTotal)} is scheduled in the next 30 days; your recorded income minus spending is ${formatCurrency(recordedMargin)}.`, action: "See recurring payments", tab: "recurring" });
  const cards = {
    netWorth: { id: "netWorth", label: "Current saved net worth", rawValue: nw.net, formatter: formatCurrency, sub: React.createElement("span", { className: "krn-amount", tabIndex: 0 }, `${formatCurrency(nw.assets)} assets − ${formatCurrency(nw.liabilities)} liabilities`), icon: Wallet, tone: "indigo" },
    income: { id: "income", label: `Recorded income · ${periodLabel}`, rawValue: fin.income, formatter: formatCurrency, sub: `${periodTx.filter(t => t.type === "income" && !isSelfTransfer(t) && !hasSystemTag(t, "Refund")).length} income transactions`, icon: ArrowUpRight, tone: "emerald" },
    spending: { id: "spending", label: `Recorded spending · ${periodLabel}`, rawValue: fin.spending, formatter: formatCurrency, sub: fin.refundsApplied > 0 ? `Net of ${fin.refundsApplied} refund${fin.refundsApplied !== 1 ? "s" : ""}` : `${periodTx.filter(t => t.type === "expense" && !isSelfTransfer(t)).length} expense transactions`, icon: ArrowDownRight, tone: "orange" },
    savingsRate: { id: "savingsRate", label: `Recorded savings rate · ${periodLabel}`, rawValue: savingsRate, formatter: value => `${value.toFixed(0)}%`, sub: fin.income > 0 ? "(income − spending) ÷ income" : "No income recorded yet", icon: TrendingUp, tone: "sky" },
    debt: { id: "debt", label: "Current saved outstanding debt", rawValue: debtTotal, formatter: formatCurrency, sub: liabilities.length ? `${formatCurrency(debtMonthly)}/month required` : "No active liabilities", icon: CreditCard, tone: "orange" },
    recurring: { id: "recurring", label: "Projected recurring · monthly", rawValue: recurringMonthly, formatter: formatCurrency, sub: "Estimated monthly equivalent", icon: Repeat, tone: "indigo" }
  };
  const visibleCards = order.filter(id => !hidden.includes(id) && cards[id]);
  function toggleCard(id) {
    const next = hidden.includes(id) ? hidden.filter(item => item !== id) : [...hidden, id];
    if (next.length < defaultOrder.length) onSaveSettings({ dashboardHiddenCards: next });
  }
  function moveCard(id, direction) {
    const next = [...order];
    const index = next.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onSaveSettings({ dashboardCardOrder: next });
  }
  const attentionTone = tone => tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-700" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-indigo-200 bg-indigo-50 text-indigo-700";
  return React.createElement(React.Fragment, null,
    React.createElement(Card, { className: "p-5 overflow-hidden" },
      React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4" },
        React.createElement("div", { className: "flex items-center gap-2" },
          React.createElement("div", { className: "w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center" }, React.createElement(LayoutDashboard, { size: 16 })),
          React.createElement("div", null, React.createElement("h2", { className: "text-[15px] font-semibold text-slate-800" }, "Current position"), React.createElement("p", { className: "text-[12px] text-slate-500 mt-0.5" }, "Saved balances and recorded activity, with projected commitments labelled separately."))
        ),
        React.createElement("button", { onClick: () => setCustomiseOpen(true), className: "min-h-11 px-3 rounded-xl border border-slate-200 bg-white text-[12.5px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-700 flex items-center gap-1.5" }, React.createElement(SlidersHorizontal, { size: 14 }), "Customise")
      ),
      React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" }, visibleCards.map(id => React.createElement(SummaryCard, { ...cards[id], key: id })))
    ),
    transactions.length < 5 && setupDone < setupSteps.length && React.createElement(Card, { className: "p-5" },
      React.createElement("div", { className: "flex items-start justify-between gap-3" },
        React.createElement("div", null, React.createElement("h2", { className: "text-[15px] font-semibold text-slate-800" }, "Get started with FinLume"), React.createElement("p", { className: "text-[12px] text-slate-600 mt-1" }, `${setupDone} of ${setupSteps.length} steps complete. These steps are optional.`)),
        React.createElement("button", { type: "button", onClick: toggleSetupHidden, "aria-expanded": !setupHidden, "aria-controls": "finlume-setup-steps", className: "min-h-11 px-3 rounded-xl border border-slate-200 text-[12px] font-semibold text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, setupHidden ? "Show guide" : "Hide guide")
      ),
      !setupHidden && React.createElement("ol", { id: "finlume-setup-steps", className: "grid grid-cols-1 md:grid-cols-3 gap-3 mt-4" }, setupSteps.map(step => React.createElement("li", { key: step.id, className: "rounded-xl border border-slate-200 bg-slate-50 p-3" },
        React.createElement("p", { className: "text-[13px] font-semibold text-slate-800" }, React.createElement("span", { "aria-hidden": "true", className: step.done ? "text-emerald-700" : "text-slate-400" }, step.done ? "✓ " : "○ "), step.title),
        React.createElement("p", { className: "text-[12px] text-slate-600 mt-1" }, step.done ? "Complete" : step.detail),
        !step.done && React.createElement("button", { type: "button", onClick: () => onGoTo(step.tab), className: "min-h-11 text-[12px] font-semibold text-indigo-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, step.action)
      )))
    ),
    React.createElement(Card, { className: "p-5" },
      React.createElement("h2", { className: "text-[15px] font-semibold text-slate-800" }, "Action inbox"),
      React.createElement("p", { className: "text-[12px] text-slate-500 mt-1 mb-3" }, "Saved transactions and schedules that may need your attention. Scheduled amounts are projections, not recorded transactions."),
      hiddenInboxKeys.length > 0 && React.createElement("p", { role: "status", className: "text-[12px] text-slate-500" }, `${hiddenInboxKeys.length} item${hiddenInboxKeys.length === 1 ? "" : "s"} hidden for this visit. Saved records are unchanged.`),
      hiddenInboxKeys.length > 0 && React.createElement("button", { type: "button", onClick: () => setHiddenInboxKeys([]), className: "mb-3 min-h-11 text-[12px] font-semibold text-indigo-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, `Show ${hiddenInboxKeys.length} hidden item${hiddenInboxKeys.length === 1 ? "" : "s"}`),
      snoozedCount > 0 && React.createElement("p", { role: "status", className: "text-[12px] text-slate-500" }, `${snoozedCount} item${snoozedCount === 1 ? "" : "s"} snoozed for one day on this device. Changed items reappear sooner.`),
      snoozedCount > 0 && React.createElement("button", { type: "button", onClick: restoreSnoozes, className: "mb-3 min-h-11 text-[12px] font-semibold text-indigo-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, "Show snoozed items"),
      snoozeError && React.createElement("p", { role: "alert", className: "mb-3 text-[12px] text-rose-700" }, snoozeError),
      splitState.status === "loading" && React.createElement("p", { role: "status", className: "text-[12px] text-slate-500 mb-2" }, "Checking Split reminders…"),
      splitState.status === "failed" && React.createElement("div", { role: "alert", className: "rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700 mb-2" }, "Split reminders could not be checked: ", splitState.error, React.createElement("button", { type: "button", onClick: () => setSplitRetry(n => n + 1), className: "ml-2 min-h-11 px-2 font-semibold underline" }, "Retry")),
      visibleInboxItems.length ? React.createElement("div", { className: "space-y-4" }, inboxGroups.map(group => React.createElement("section", { key: group.id, "aria-labelledby": `inbox-${group.id}` },
        React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-2" }, React.createElement("div", null, React.createElement("h3", { id: `inbox-${group.id}`, className: "text-[13px] font-semibold text-slate-800" }, `${group.title} (${group.items.length})`), React.createElement("p", { className: "text-[11.5px] text-slate-500" }, group.description)), group.items.length > group.limit && React.createElement("button", { type: "button", onClick: () => setExpandedInboxGroups(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id]), "aria-expanded": expandedInboxGroups.includes(group.id), "aria-controls": `inbox-list-${group.id}`, className: "min-h-11 px-2 text-[12px] font-semibold text-indigo-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, expandedInboxGroups.includes(group.id) ? "Show less" : `Show all ${group.items.length}`)),
        React.createElement("ul", { id: `inbox-list-${group.id}`, className: "space-y-2" }, (expandedInboxGroups.includes(group.id) ? group.items : group.items.slice(0, group.limit)).map(item => React.createElement("li", { key: item.key, className: "rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between" },
        React.createElement("div", { className: "min-w-0" }, React.createElement("p", { className: "text-[13px] font-semibold text-slate-800 break-words" }, item.title), React.createElement("p", { className: "text-[12px] text-slate-600" }, item.reason), React.createElement("p", { className: "text-[11.5px] text-slate-500 mt-1" }, item.kind, item.date ? ` · ${formatDateDisplay(item.date)}` : "", item.amount != null ? ` · ${formatCurrency(item.amount)}` : "")),
        React.createElement("div", { className: "flex items-center gap-2 shrink-0" },
          React.createElement("button", { type: "button", onClick: () => item.key === "categorization" ? onGoTo("transactions", { review: true }) : item.tab === "split" ? onOpenSplit?.(item.groupId) : item.tab === "import" ? onOpenImport?.() : onGoTo(item.tab), className: "min-h-11 px-3 rounded-xl border border-indigo-200 bg-white text-indigo-700 text-[12px] font-semibold hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, item.key === "categorization" ? "Open Transaction Review" : `Open ${item.tab}`),
          React.createElement("button", { type: "button", onClick: () => snoozeItem(item), "aria-label": `Snooze ${item.title} for one day on this device`, title: "Snooze for one day on this device", className: "min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, React.createElement(CalendarClock, { size: 16 })),
          React.createElement("button", { type: "button", onClick: () => setHiddenInboxKeys(keys => [...keys, item.key]), "aria-label": `Hide ${item.title} for this visit`, title: "Hide for this visit", className: "min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-slate-600 text-xl hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" }, "×"))
      )))))) : allInboxItems.length ? React.createElement("p", { className: "text-[13px] text-slate-500" }, "All action items are hidden or snoozed on this device. Use the controls above to restore them.") : splitState.status === "ready" ? React.createElement("p", { className: "text-[13px] text-slate-500" }, "No action items found in the loaded Finance and Split records.") : React.createElement("p", { className: "text-[13px] text-slate-500" }, "No Finance action items found. Split status is not yet confirmed.")
    ),
    React.createElement("div", { className: "grid grid-cols-1 xl:grid-cols-5 gap-4" },
      React.createElement(Card, { className: "p-5 xl:col-span-3" },
        React.createElement("div", { className: "flex items-center justify-between gap-3 mb-3" },
          React.createElement("div", null, React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700 flex items-center gap-1.5" }, React.createElement(CalendarClock, { size: 14, className: "text-indigo-500" }), "Upcoming commitments · next 30 days"), React.createElement("p", { className: "text-[11.5px] text-slate-400 mt-0.5" }, "Projected from saved recurring items and loan due days; not recorded spending")),
          React.createElement("span", { className: "text-[14px] font-semibold text-slate-800" }, formatCurrency(upcomingTotal))
        ),
        upcomingPayments.length === 0 ? React.createElement("p", { className: "text-[13px] text-slate-500 rounded-xl bg-slate-50 px-3 py-4" }, "No dated payments are scheduled in the next 30 days.") : React.createElement("div", { className: "space-y-2" }, upcomingPayments.slice(0, 5).map(item => React.createElement("button", { key: item.id, onClick: () => onGoTo(item.tab), className: "w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-left hover:border-indigo-200" }, React.createElement("div", { className: "min-w-0" }, React.createElement("p", { className: "text-[13px] font-medium text-slate-700 truncate" }, item.name), React.createElement("p", { className: "text-[11.5px] text-slate-400" }, item.kind, " · ", formatDateDisplay(item.date))), React.createElement("span", { className: "text-[13px] font-semibold text-slate-700 shrink-0" }, formatCurrency(item.amount)))))
      ),
      React.createElement(Card, { className: "p-5 xl:col-span-2" },
        React.createElement("h3", { className: "text-[14px] font-semibold text-slate-700 flex items-center gap-1.5" }, React.createElement(ShieldAlert, { size: 14, className: attention.length ? "text-amber-500" : "text-emerald-500" }), attention.length ? "Needs your attention" : "No Finance warnings"),
        React.createElement("p", { className: "text-[12px] text-slate-500 mt-1 mb-3" }, attention.length ? "These checks are based only on the data saved in Finlume." : "No budget, maturity or review warnings were found in loaded Finance data."),
        attention.length > 0 && React.createElement("div", { className: "space-y-2" }, attention.slice(0, 3).map(item => React.createElement("div", { key: item.id, className: `rounded-xl border px-3 py-2.5 ${attentionTone(item.tone)}` }, React.createElement("p", { className: "text-[12.5px] font-semibold" }, item.title), React.createElement("p", { className: "text-[11.5px] opacity-80 mt-0.5" }, item.detail), React.createElement("button", { onClick: () => onGoTo(item.tab), className: "text-[11.5px] font-semibold mt-1.5 hover:underline" }, item.action, " →")))),
        React.createElement("div", { className: "mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5" }, React.createElement("p", { className: "text-[11.5px] text-slate-500" }, "This month's recorded margin"), React.createElement("p", { className: `text-[17px] font-semibold mt-0.5 ${recordedMargin >= 0 ? "text-emerald-600" : "text-rose-600"}` }, formatCurrency(recordedMargin)), React.createElement("p", { className: "text-[10.5px] text-slate-400 mt-0.5" }, "Recorded income minus recorded spending; upcoming payments are shown separately."))
      )
    ),
    React.createElement(Modal, { open: customiseOpen, onClose: () => setCustomiseOpen(false), title: "Customise dashboard", width: "max-w-lg" },
      React.createElement("p", { className: "text-[12.5px] text-slate-500 mb-4" }, "Choose which summary cards appear and arrange them in the order you prefer."),
      React.createElement("div", { className: "space-y-2" }, order.map((id, index) => React.createElement("div", { key: id, className: "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5" }, React.createElement("input", { type: "checkbox", checked: !hidden.includes(id), onChange: () => toggleCard(id), className: "accent-indigo-600 w-4 h-4", "aria-label": `Show ${cards[id].label} card` }), React.createElement("span", { className: "text-[13px] font-medium text-slate-700 flex-1" }, cards[id].label), React.createElement("button", { disabled: index === 0, onClick: () => moveCard(id, -1), className: "w-8 h-8 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30", "aria-label": `Move ${cards[id].label} up` }, "↑"), React.createElement("button", { disabled: index === order.length - 1, onClick: () => moveCard(id, 1), className: "w-8 h-8 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30", "aria-label": `Move ${cards[id].label} down` }, "↓")))),
      React.createElement("div", { className: "flex justify-end mt-4" }, React.createElement(Button, { variant: "primary", onClick: () => setCustomiseOpen(false) }, "Done"))
    )
  );
}
return DashboardCommandCentre;
}
