import { withTransactionAudit } from "./transaction-audit.js";
import { confirmSettingsFieldsChange } from "../../platform/confirmed-settings-fields.js";

export async function confirmCategorySuggestion({ keyword, category, beforeKeywords }, {
  readSettings, saveSettings, setSettings,
  readTransactions, saveTransactions, setTransactions,
}) {
  const word = keyword?.trim();
  if (!word || !category) throw new Error("Choose a keyword and category before saving the rule.");
  const previous = beforeKeywords || {};
  const existing = previous[category] || [];
  const nextKeywords = { ...previous, [category]: [...new Set([...existing, word])] };
  await confirmSettingsFieldsChange(
    { categoryKeywords: previous }, { categoryKeywords: nextKeywords },
    { readSettings, saveSettings, setSettings, allowedKeys: ["categoryKeywords"], messages: {
      changed: "Category rules changed elsewhere. Review the current rules before retrying.",
      uncertain: "The category rule result could not be confirmed. Reconnect and review Settings before retrying.",
      failed: "The category rule was not confirmed. Review Settings and retry.",
    } },
  );

  let before;
  try { before = await readTransactions(); }
  catch { throw new Error("The rule was saved, but past transactions could not be checked. Reconnect and retry here."); }
  const matches = tx => tx?.type === "expense" && tx.category === "Needs review"
    && (tx.merchant || "").toLowerCase().includes(word.toLowerCase());
  const ids = new Set(before.filter(matches).map(tx => tx.id));
  if (!ids.size) { setTransactions(before); return { updated: 0 }; }
  const at = new Date().toISOString();
  const next = before.map(tx => ids.has(tx.id) ? { ...tx, ...withTransactionAudit(tx, { category }, at, `category rule: ${word}`), categoryOrigin: "rule" } : tx);
  let saved = false;
  try { saved = await saveTransactions(next); } catch { /* Check whether the write landed. */ }
  if (saved) { setTransactions(next); return { updated: ids.size }; }
  let after;
  try { after = await readTransactions(); }
  catch { throw new Error("The rule was saved, but updates to past transactions could not be confirmed. Reconnect and retry here."); }
  setTransactions(after);
  if (after.every(tx => !ids.has(tx.id) || tx.category === category)) return { updated: ids.size };
  throw new Error("The rule was saved, but some past transactions were not updated. Retry here to finish.");
}
