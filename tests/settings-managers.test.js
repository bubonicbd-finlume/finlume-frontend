import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSettingsManagers } from "../src/features/settings/managers.js";
import { removeIndexedRule } from "../src/features/settings/keyword-rules.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  Button: box, Card: box, EmptyState: box, IconButton: icon,
  ListChecks: icon, ManageEntryModal: () => null, Pencil: icon,
  Pill: box, Plus: icon, ToggleSwitch: icon, Trash2: icon,
  inputCls: "", selectCls: "", nowISO: () => "2026-10-18T00:00:00Z",
  uid: () => "id-1",
};

test("Settings category and subcategory managers render saved categories", () => {
  const { CategorizationRulesManager, SubcategoriesManager } = createSettingsManagers(deps);
  const settings = {
    categories: ["Groceries"], categoryKeywords: { Groceries: ["market"] },
    nameRules: [{ id: "one", text: "bakery", category: "Groceries" }],
    subcategories: { Groceries: ["Produce"] }, categorizationRules: [],
  };
  const rules = renderToString(React.createElement(CategorizationRulesManager, {
    settings, onSaveSettings: () => {}, onConfirmCategorizationSettings: () => {}, NameRulesManager: box,
  }));
  const subs = renderToString(React.createElement(SubcategoriesManager, {
    settings, onSaveSettings: () => {}, onConfirmCategorizationSettings: () => {},
  }));
  assert.match(rules, /Groceries/);
  assert.match(rules, /bakery/);
  assert.match(rules, /market/);
  assert.equal((rules.match(/Add rule/g) || []).length, 1);
  assert.match(rules, /Choose category/);
  assert.match(rules, /aria-label="Category for new rule"/);
  assert.doesNotMatch(rules, /Quick keyword rules/);
  assert.match(subs, /Produce/);
});

test("removing one legacy duplicate rule preserves its siblings", () => {
  const first = { id: "same", text: "market", category: "Groceries" };
  const second = { id: "same", text: "market", category: "Groceries" };
  const malformed = { text: 42 };
  assert.deepEqual(removeIndexedRule([first, malformed, second], 2), [first, malformed]);
  assert.deepEqual(removeIndexedRule(["market", "market", "other"], 1), ["market", "other"]);
});

test("long saved rule lists stay compact and remain searchable", () => {
  const { CategorizationRulesManager } = createSettingsManagers(deps);
  const settings = { categories: ["Groceries"], nameRules: Array.from({ length: 12 }, (_, index) => ({ id: `r${index}`, text: `merchant-${index}`, category: "Groceries" })), categoryKeywords: {}, rules: [] };
  const html = renderToString(React.createElement(CategorizationRulesManager, { settings, transactions: [], onConfirmCategorizationSettings() {} }));
  assert.match(html, /Search 12 saved rules/);
  assert.match(html, /merchant-7/);
  assert.doesNotMatch(html, /merchant-8/);
  assert.match(html, /Show 8 more/);
});

test("advanced rules render duplicate IDs and an unsupported container safely", () => {
  const { CategorizationRulesManager } = createSettingsManagers(deps);
  const base = { categories: ["Groceries"], nameRules: [], categoryKeywords: {} };
  const duplicateRules = [
    { id: "same", whenText: "market one", thenText: "Groceries", enabled: true },
    { id: "same", whenText: "market two", thenText: "Groceries", enabled: false },
  ];
  const props = { onConfirmCategorizationSettings: () => {} };
  const populated = renderToString(React.createElement(CategorizationRulesManager, {
    ...props, settings: { ...base, rules: duplicateRules },
  }));
  assert.match(populated, /market one/);
  assert.match(populated, /market two/);
  const malformed = renderToString(React.createElement(CategorizationRulesManager, {
    ...props, settings: { ...base, rules: { damaged: true } },
  }));
  assert.match(malformed, /Advanced rules/);
  const malformedEntry = renderToString(React.createElement(CategorizationRulesManager, {
    ...props, settings: { ...base, rules: [null, duplicateRules[0]] },
  }));
  assert.match(malformedEntry, /Invalid saved rule/);
  assert.match(malformedEntry, /market one/);
});
