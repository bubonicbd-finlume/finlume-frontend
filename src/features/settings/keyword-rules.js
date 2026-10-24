import React, { useRef, useState } from "react";
import { RulePreviewPanel } from "./rule-preview-panel.js";

export function removeIndexedRule(items, index) {
  return items.filter((_, savedIndex) => savedIndex !== index);
}

export function createKeywordRulesManager({ Button, Card, Plus, inputCls, selectCls, uid }) {
  return function KeywordRulesManager({ settings, transactions, onConfirmCategorizationSettings }) {
    const [text, setText] = useState("");
    const [category, setCategory] = useState("");
    const [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [visibleCount, setVisibleCount] = useState(8);
    const busyRef = useRef(false);
    const pendingId = useRef(null);
    const nameRules = Array.isArray(settings.nameRules) ? settings.nameRules : [];
    const keywordMap = settings.categoryKeywords && typeof settings.categoryKeywords === "object" && !Array.isArray(settings.categoryKeywords)
      ? settings.categoryKeywords : {};
    const entries = [
      ...nameRules.flatMap((rule, index) => rule && typeof rule.text === "string" && typeof rule.category === "string"
        ? [{ source: "nameRules", key: `name:${index}`, index, text: rule.text, category: rule.category }]
        : []),
      ...Object.entries(keywordMap).flatMap(([cat, words]) => Array.isArray(words)
        ? words.flatMap((word, index) => typeof word === "string"
          ? [{ source: "categoryKeywords", key: `keyword:${cat}:${index}`, index, text: word, category: cat }]
          : [])
        : []),
    ];
    const matchingEntries = entries.filter(entry => (!categoryFilter || entry.category === categoryFilter) && (!query.trim() || `${entry.text} ${entry.category}`.toLowerCase().includes(query.trim().toLowerCase())));
    const shownEntries = matchingEntries.slice(0, visibleCount);

    async function save(field, before, next, onSuccess) {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError("");
      try {
        await onConfirmCategorizationSettings(field, before, next);
        onSuccess?.();
      } catch (cause) {
        setError(cause?.message || "The rule change could not be confirmed. Review and retry.");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    }

    function add() {
      const word = text.trim();
      if (!word || !category) return;
      if ((!editing || editing.source === "nameRules") && !Array.isArray(settings.nameRules) && settings.nameRules != null) {
        setError("Saved name rules have an unsupported format. No change was made.");
        return;
      }
      if (entries.some(entry => entry.key !== editing?.key && entry.text.toLowerCase() === word.toLowerCase())) {
        setError("That name or keyword already has a rule. Remove it before adding a replacement.");
        return;
      }
      if (editing) {
        if (editing.source === "nameRules") {
          save("nameRules", nameRules, nameRules.map((rule, index) => index === editing.index ? { ...rule, text: word, category } : rule), () => { setEditing(null); setText(""); setCategory(""); });
        } else {
          const oldWords = keywordMap[editing.category];
          if (!Array.isArray(oldWords)) { setError("Saved keywords have an unsupported format. No change was made."); return; }
          const next = { ...keywordMap, [editing.category]: removeIndexedRule(oldWords, editing.index) };
          const target = Array.isArray(next[category]) ? [...next[category]] : [];
          if (category === editing.category) target.splice(editing.index, 0, word);
          else target.push(word);
          next[category] = target;
          save("categoryKeywords", keywordMap, next, () => { setEditing(null); setText(""); setCategory(""); });
        }
        return;
      }
      if (!pendingId.current) pendingId.current = uid();
      save("nameRules", nameRules, [{ id: pendingId.current, text: word, category }, ...nameRules], () => {
        pendingId.current = null;
        setText("");
      });
    }

    function remove(entry) {
      if (entry.source === "nameRules") {
        if (!Array.isArray(settings.nameRules)) {
          setError("Saved name rules have an unsupported format. No change was made.");
          return;
        }
        save("nameRules", nameRules, removeIndexedRule(nameRules, entry.index));
      } else {
        const words = keywordMap[entry.category];
        if (!Array.isArray(words)) {
          setError("Saved keywords have an unsupported format. No change was made.");
          return;
        }
        save("categoryKeywords", keywordMap, { ...keywordMap, [entry.category]: removeIndexedRule(words, entry.index) });
      }
    }

    return React.createElement("div", null,
      React.createElement("h4", { className: "text-[13px] font-semibold text-slate-700 mb-1" }, "Names and keywords"),
      React.createElement("p", { className: "text-[12.5px] text-slate-500 mb-3" },
        "Match a name or word in a transaction description and assign a category. Existing keyword rules appear here too and keep their original matching order."),
      React.createElement(Card, { className: "p-4" },
        React.createElement("div", { className: "flex flex-col sm:flex-row gap-2 mb-4" },
          React.createElement("input", { className: `${inputCls} flex-1`, value: text, placeholder: "Name or keyword, e.g. Nikhil", "aria-label": "Name or keyword", disabled: busy,
            onChange: event => { setText(event.target.value); setError(""); }, onKeyDown: event => { if (event.key === "Enter") { event.preventDefault(); add(); } } }),
          React.createElement("select", { className: `${selectCls} sm:!w-48`, value: category, disabled: busy,
            "aria-label": "Category for new rule",
            onChange: event => setCategory(event.target.value) },
            React.createElement("option", { value: "" }, "Choose category"),
            (Array.isArray(settings.categories) ? settings.categories : []).map(item => React.createElement("option", { key: item, value: item }, item))),
          React.createElement(Button, { variant: "primary", onClick: add, disabled: busy || !text.trim() || !category },
            React.createElement(Plus, { size: 15 }), busy ? "Saving…" : editing ? "Save change" : "Add rule"),
          editing && React.createElement(Button, { variant: "outline", onClick: () => { setEditing(null); setText(""); setCategory(""); }, disabled: busy }, "Cancel")),
        text.trim() && category && React.createElement(RulePreviewPanel, { transactions, settings, draft: { text, category }, source: editing?.source === "categoryKeywords" ? "keyword" : "name", savedIndex: editing?.index ?? -1 }),
        error && React.createElement("p", { role: "alert", className: "text-[12.5px] text-rose-700 mb-3" }, error),
        entries.length > 0 && React.createElement("div", { className: "flex flex-col sm:flex-row gap-2 mb-3" },
          React.createElement("input", { className: `${inputCls} flex-1`, value: query, placeholder: `Search ${entries.length} saved rules`, "aria-label": "Search saved name and keyword rules", onChange: event => { setQuery(event.target.value); setVisibleCount(8); } }),
          React.createElement("select", { className: `${selectCls} sm:!w-48`, value: categoryFilter, "aria-label": "Filter saved rules by category", onChange: event => { setCategoryFilter(event.target.value); setVisibleCount(8); } },
            React.createElement("option", { value: "" }, "All categories"), [...new Set(entries.map(entry => entry.category))].sort().map(item => React.createElement("option", { key: item, value: item }, item)))),
        React.createElement("p", { className: "text-[12px] text-slate-500 mb-2", role: "status" }, `Showing ${shownEntries.length} of ${matchingEntries.length} matching rules`),
        shownEntries.length ? React.createElement("ul", { className: "space-y-2" }, shownEntries.map(entry =>
          React.createElement("li", { key: entry.key, className: "flex min-w-0 flex-wrap sm:flex-nowrap items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5" },
            React.createElement("span", { className: "w-full sm:w-auto min-w-0 sm:flex-1 truncate text-[13px] font-medium text-slate-700", title: entry.text }, entry.text),
            React.createElement("span", { className: "hidden sm:inline text-slate-300 shrink-0" }, "→"),
            React.createElement("span", { className: "min-w-0 flex-1 sm:flex-none sm:max-w-[35%] truncate text-[12.5px] text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5", title: entry.category }, entry.category),
            React.createElement("button", { type: "button", onClick: () => { setEditing(entry); setText(entry.text); setCategory(entry.category); setError(""); }, disabled: busy,
              "aria-label": `Edit ${entry.text} rule`, className: "min-h-11 px-2 text-[11.5px] font-medium text-indigo-700 hover:underline shrink-0 disabled:opacity-50" }, "Edit"),
            React.createElement("button", { type: "button", onClick: () => remove(entry), disabled: busy,
              "aria-label": `Remove ${entry.text} rule`, className: "ml-auto min-h-11 px-2 text-[11.5px] font-medium text-slate-500 hover:text-rose-600 shrink-0 disabled:opacity-50" }, "Remove"))))
          : React.createElement("p", { className: "text-[12.5px] text-slate-500" }, entries.length ? "No saved rules match these filters." : "No rules yet."),
        matchingEntries.length > visibleCount && React.createElement("button", { type: "button", onClick: () => setVisibleCount(count => count + 8), className: "mt-3 min-h-11 px-3 rounded-xl border border-indigo-200 text-[12.5px] font-semibold text-indigo-700 hover:bg-indigo-50" }, `Show 8 more (${matchingEntries.length - visibleCount} remaining)`)));
  };
}
