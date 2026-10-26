const SUBSCRIPTION_HINTS = ["netflix", "spotify", "hulu", "disney", "youtube", "icloud", "dropbox", "adobe", "microsoft", "amazon prime", "patreon", "membership", "studio", "gym", "openai", "chatgpt", "canva", "notion", "zoom", "slack", "github"];
const RECURRING_HINTS = ["mortgage", "rent", "loan", "insurance", "utility", "utilities", "electric", "water", "internet", "phone", "mobile", "daycare", "tuition", "lease", "car payment", "auto payment", "hoa", "property tax"];

export function uniqueSchedules(settings = {}) {
  const seen = new Set();
  const items = [];
  for (const [list, sourceKind] of [[settings.recurring, "recurring"], [settings.subscriptions, "subscription"]]) {
    for (const item of Array.isArray(list) ? list : []) {
      if (!item) continue;
      const key = item.id ? `id:${item.id}` : `detail:${String(item.name || "").trim().toLowerCase()}|${item.nextDate || ""}|${item.cadence || "monthly"}|${item.amount || 0}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...item, kind: sourceKind });
    }
  }
  return items;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function addDays(value, days) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function fallbackAddMonths(value, count, anchorDay) {
  const [year, month, day] = String(value).split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + count, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(anchorDay || day, lastDay));
  return first.toISOString().slice(0, 10);
}

export function monthlyEquivalent(value, cadence, intervalDays) {
  const amount = Number(value) || 0;
  if (cadence === "daily") return amount * 365.25 / 12;
  if (cadence === "custom") return amount * 30.4375 / Math.max(1, Number(intervalDays) || 1);
  if (cadence === "weekly") return amount * 52 / 12;
  if (cadence === "biweekly") return amount * 26 / 12;
  if (cadence === "quarterly") return amount / 3;
  if (cadence === "half-yearly" || cadence === "semiannual") return amount / 6;
  if (cadence === "annual") return amount / 12;
  return amount;
}

export function classifyCadence(intervalDays) {
  if (intervalDays >= 5 && intervalDays <= 9) return "weekly";
  if (intervalDays >= 12 && intervalDays <= 17) return "biweekly";
  if (intervalDays >= 24 && intervalDays <= 40) return "monthly";
  if (intervalDays >= 75 && intervalDays <= 110) return "quarterly";
  if (intervalDays >= 330 && intervalDays <= 400) return "annual";
  return null;
}

export function nextOccurrence(lastDate, cadence, typicalInterval, today, addMonths = fallbackAddMonths) {
  const monthStep = { monthly: 1, quarterly: 3, annual: 12 }[cadence];
  const anchorDay = Number(String(lastDate).slice(-2));
  const advance = value => monthStep ? addMonths(value, monthStep, anchorDay) : addDays(value, Math.round(typicalInterval));
  let nextDate = advance(lastDate);
  let guard = 0;
  while (nextDate < today && guard++ < 200) nextDate = advance(nextDate);
  return nextDate;
}

export function detectCandidates(transactions, dismissedPatterns = [], options = {}) {
  const normalizeMerchant = options.normalizeMerchant || (value => String(value || "").trim().toLowerCase());
  const isSelfTransfer = options.isSelfTransfer || (() => false);
  const isRefund = options.isRefund || (() => false);
  const today = options.today || new Date().toISOString().slice(0, 10);
  const groups = new Map();

  for (const transaction of transactions || []) {
    if (transaction.type !== "expense" || isSelfTransfer(transaction) || isRefund(transaction)) continue;
    const key = normalizeMerchant(transaction.merchant);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(transaction);
  }

  const dismissed = new Set(dismissedPatterns || []);
  const candidates = [];
  for (const [key, group] of groups.entries()) {
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    const uniqueByDate = [...new Map(sorted.map(transaction => [transaction.date, transaction])).values()];
    if (uniqueByDate.length < 2) continue;
    const intervals = [];
    for (let index = 1; index < uniqueByDate.length; index++) {
      const days = Math.round((parseDate(uniqueByDate[index].date) - parseDate(uniqueByDate[index - 1].date)) / 864e5);
      if (days > 0) intervals.push(days);
    }
    if (!intervals.length) continue;
    const typicalInterval = median(intervals);
    const cadence = classifyCadence(typicalInterval);
    if (!cadence) continue;
    const amounts = uniqueByDate.map(transaction => Number(transaction.amount) || 0).filter(amount => amount > 0);
    if (!amounts.length) continue;
    const typicalAmount = median(amounts);
    const amountDeviation = median(amounts.map(amount => Math.abs(amount - typicalAmount))) / Math.max(typicalAmount, 1);
    const toleranceDays = cadence === "weekly" ? 3 : cadence === "biweekly" ? 4 : cadence === "monthly" ? 7 : cadence === "quarterly" ? 14 : 35;
    const intervalConsistency = intervals.filter(days => Math.abs(days - typicalInterval) <= toleranceDays).length / intervals.length;
    const categoryTags = [...uniqueByDate.map(transaction => transaction.category || ""), ...uniqueByDate.flatMap(transaction => transaction.tags || [])].join(" ").toLowerCase();
    const isSubscription = categoryTags.includes("subscription") || SUBSCRIPTION_HINTS.some(hint => key.includes(hint));
    const isRecurring = RECURRING_HINTS.some(hint => key.includes(hint) || categoryTags.includes(hint));
    const hasStrongHint = isSubscription || isRecurring;
    if (!hasStrongHint && uniqueByDate.length < 3) continue;
    if (intervalConsistency < (hasStrongHint ? 0.45 : 0.65)) continue;
    if (amountDeviation > (isSubscription ? 0.2 : hasStrongHint ? 0.35 : 0.12)) continue;
    let score = 35 + Math.min(25, (uniqueByDate.length - 2) * 8) + Math.round(intervalConsistency * 25) + Math.round(Math.max(0, 1 - amountDeviation * 3) * 15);
    if (hasStrongHint) score += 10;
    score = Math.min(99, score);
    const patternKey = `${key}|${cadence}`;
    if (dismissed.has(patternKey)) continue;
    candidates.push({
      patternKey,
      normalizedMerchant: key,
      displayMerchant: uniqueByDate.at(-1).merchant,
      category: uniqueByDate.at(-1).category,
      cadence,
      occurrences: uniqueByDate.length,
      confidence: score >= 80 ? "high" : "likely",
      confidenceScore: score,
      matchReason: `${Math.round(intervalConsistency * 100)}% timing consistency · typical interval ${Math.round(typicalInterval)} days`,
      avgAmount: typicalAmount,
      monthlyEquivalent: monthlyEquivalent(typicalAmount, cadence),
      nextDate: nextOccurrence(uniqueByDate.at(-1).date, cadence, typicalInterval, today, options.addMonths),
      isSubscription
    });
  }

  return candidates.sort((a, b) => b.confidenceScore - a.confidenceScore || b.monthlyEquivalent - a.monthlyEquivalent);
}

export function detectAmountAnomalies(transactions, settings, options = {}) {
  const normalizeMerchant = options.normalizeMerchant || (value => String(value || "").trim().toLowerCase());
  const formatCurrency = options.formatCurrency || (value => String(value));
  const dismissed = new Set(settings.dismissedAnomalies || []);
  const items = [...(settings.recurring || []).map(item => ({ ...item, sourceKind: "recurring" })), ...(settings.subscriptions || []).map(item => ({ ...item, sourceKind: "subscription" }))];
  const flags = [];

  for (const item of items) {
    if (item.active === false) continue;
    const linkKey = item.linkMerchant || normalizeMerchant(item.name);
    const matches = (transactions || []).filter(transaction => transaction.type === "expense" && normalizeMerchant(transaction.merchant) === linkKey).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    if (matches.length < 3) continue;
    const baseline = median(matches.slice(1).map(transaction => Number(transaction.amount) || 0));
    const latest = Number(matches[0].amount) || 0;
    if (!baseline || latest <= baseline * 1.25) continue;
    const key = `amount-anomaly:${item.sourceKind}:${item.id}:${matches[0].id}`;
    if (dismissed.has(key)) continue;
    flags.push({ key, type: "amount_anomaly", subscriptionId: item.id, name: item.name, reason: `Latest charge is ${formatCurrency(latest)}, ${Math.round((latest / baseline - 1) * 100)}% above the recent typical ${formatCurrency(baseline)}.` });
  }

  return flags;
}
