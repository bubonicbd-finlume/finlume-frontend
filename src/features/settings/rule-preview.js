function textOf(transaction) {
  return String(transaction.rawNarration || transaction.merchant || "");
}

function conditionOf(rule) {
  return String(rule?.whenText || "").toLowerCase().replace(/merchant contains|"/gi, "").trim();
}

function advancedCategory(rule, categories) {
  if ((categories || []).includes(rule?.category)) return rule.category;
  return (categories || []).find(category => String(rule?.thenText || "").toLowerCase().includes(String(category).toLowerCase())) || null;
}

// Mirrors the saved import order: name rules, keywords, then advanced rules.
export function previewCategorizationRule(transactions, settings, draft, source, savedIndex = -1, limit = 25) {
  const categories = Array.isArray(settings.categories) ? settings.categories : [];
  const names = Array.isArray(settings.nameRules) ? settings.nameRules : [];
  const keywords = settings.categoryKeywords && typeof settings.categoryKeywords === "object" && !Array.isArray(settings.categoryKeywords) ? settings.categoryKeywords : {};
  const advanced = Array.isArray(settings.rules) ? settings.rules : [];
  const needle = source === "advanced" ? conditionOf(draft) : String(draft.text || "").trim().toLowerCase();
  if (!needle || !draft.category || !categories.includes(draft.category)) return [];
  const sample = (Array.isArray(transactions) ? transactions : []).slice(0, 500);
  const results = [];
  for (const transaction of sample) {
    if (!transaction || !textOf(transaction).toLowerCase().includes(needle)) continue;
    const hay = textOf(transaction).toLowerCase();
    let higherPriority = null;
    let overriddenBy = null;
    if (source === "name") {
      const before = savedIndex < 0 ? [] : names.slice(0, savedIndex);
      higherPriority = before.find(rule => rule?.text && hay.includes(String(rule.text).toLowerCase()) && categories.includes(rule.category))?.category || null;
    } else if (source === "keyword") {
      higherPriority = names.find(rule => rule?.text && hay.includes(String(rule.text).toLowerCase()) && categories.includes(rule.category))?.category || null;
      if (!higherPriority) {
        for (const [category, words] of Object.entries(keywords)) {
          if (category === draft.category && savedIndex >= 0) {
            const prior = (Array.isArray(words) ? words : []).slice(0, savedIndex);
            if (prior.some(word => word && hay.includes(String(word).toLowerCase()))) { higherPriority = category; break; }
          } else if (Array.isArray(words) && words.some(word => word && hay.includes(String(word).toLowerCase()))) { higherPriority = category; break; }
        }
      }
    }
    for (let index = 0; index < advanced.length; index++) {
      if (source === "advanced" && index === savedIndex) continue;
      const rule = advanced[index];
      const category = rule?.enabled && conditionOf(rule) && hay.includes(conditionOf(rule)) ? advancedCategory(rule, categories) : null;
      if (!category) continue;
      if (source === "advanced" && index < savedIndex) higherPriority = category;
      else overriddenBy = category;
    }
    results.push({ text: textOf(transaction), currentCategory: transaction.category || "Needs review", proposedCategory: draft.category, higherPriority, overriddenBy });
    if (results.length >= limit) break;
  }
  return results;
}

export function categoryFromAdvancedDraft(thenText, categories) {
  return advancedCategory({ thenText }, categories);
}
