import test from "node:test";
import assert from "node:assert/strict";
import { previewCategorizationRule } from "../src/features/settings/rule-preview.js";

test("rule preview reports earlier names and later advanced overrides", () => {
  const matches = previewCategorizationRule(
    [{ merchant: "Uber trip", category: "Travel" }],
    { categories: ["Travel", "Transport", "Business"], nameRules: [{ text: "Uber", category: "Travel" }], rules: [{ enabled: true, whenText: 'merchant contains "Uber"', thenText: "set category to Business" }] },
    { text: "Uber", category: "Transport" }, "keyword"
  );
  assert.equal(matches[0].currentCategory, "Travel");
  assert.equal(matches[0].proposedCategory, "Transport");
  assert.equal(matches[0].higherPriority, "Travel");
  assert.equal(matches[0].overriddenBy, "Business");
});

test("rule preview is bounded and leaves transactions untouched", () => {
  const transactions = Array.from({ length: 30 }, (_, id) => ({ id, merchant: "Cafe", category: "Food" }));
  const before = JSON.stringify(transactions);
  const matches = previewCategorizationRule(transactions, { categories: ["Food", "Dining"] }, { text: "Cafe", category: "Dining" }, "name");
  assert.equal(matches.length, 25);
  assert.equal(JSON.stringify(transactions), before);
});
