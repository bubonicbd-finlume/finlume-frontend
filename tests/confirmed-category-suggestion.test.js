import test from "node:test";
import assert from "node:assert/strict";
import { confirmCategorySuggestion } from "../src/features/transactions/confirmed-suggestion.js";

const choice = { keyword: "Cafe", category: "Dining", beforeKeywords: {} };
const source = [{ id: "one", type: "expense", merchant: "Cafe visit", category: "Needs review" },
  { id: "two", type: "income", merchant: "Cafe refund", category: "Needs review" }];

function fixture({ failSettings = false, failTransactions = false, lostTransactionReply = false } = {}) {
  let settings = { categoryKeywords: {}, theme: "dark" };
  let transactions = structuredClone(source);
  let visibleSettings;
  let visibleTransactions;
  return {
    deps: {
      readSettings: async () => settings,
      saveSettings: async next => { if (failSettings) return false; settings = next; return true; },
      setSettings: next => { visibleSettings = next; },
      readTransactions: async () => transactions,
      saveTransactions: async next => {
        if (failTransactions) return false;
        transactions = next;
        return !lostTransactionReply;
      },
      setTransactions: next => { visibleTransactions = next; },
    },
    get: () => ({ settings, transactions, visibleSettings, visibleTransactions }),
  };
}

test("suggested category rule confirms settings and matching expenses", async () => {
  const state = fixture();
  assert.deepEqual(await confirmCategorySuggestion(choice, state.deps), { updated: 1 });
  assert.deepEqual(state.get().settings.categoryKeywords, { Dining: ["Cafe"] });
  assert.equal(state.get().transactions[0].category, "Dining");
  assert.equal(state.get().transactions[1].category, "Needs review");
});

test("failed rule save leaves transactions unchanged", async () => {
  const state = fixture({ failSettings: true });
  await assert.rejects(confirmCategorySuggestion(choice, state.deps), /rule was not confirmed/);
  assert.deepEqual(state.get().transactions, source);
});

test("failed transaction step can be retried without duplicating the saved rule", async () => {
  const state = fixture({ failTransactions: true });
  await assert.rejects(confirmCategorySuggestion(choice, state.deps), /Retry here to finish/);
  assert.deepEqual(state.get().settings.categoryKeywords, { Dining: ["Cafe"] });
  state.deps.saveTransactions = async next => { state.deps.readTransactions = async () => next; return true; };
  assert.deepEqual(await confirmCategorySuggestion(choice, state.deps), { updated: 1 });
});

test("lost transaction response is confirmed by a fresh read", async () => {
  const state = fixture({ lostTransactionReply: true });
  assert.deepEqual(await confirmCategorySuggestion(choice, state.deps), { updated: 1 });
  assert.equal(state.get().visibleTransactions[0].category, "Dining");
});
