function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
  return value;
}

function same(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

export function prepareDatePaymentRow(row, { ruleId, origDate, patch, transaction, removeTransactionId, patchRules, prepareTransaction }) {
  const settings = row?.settings;
  const transactions = row?.transactions;
  if (!settings || typeof settings !== "object" || Array.isArray(settings) || !Array.isArray(settings.datesToRemember) || !Array.isArray(transactions)) {
    throw new Error("Saved dates or transactions have an unsupported format. No payment was changed.");
  }
  const matches = settings.datesToRemember.filter(rule => rule && rule.id === ruleId);
  if (matches.length !== 1 || matches[0].deletedAt) throw new Error("This date changed or has a duplicate ID. Review Dates to Remember before retrying.");
  if (!origDate || typeof patchRules !== "function") throw new Error("The date payment could not be prepared.");
  const nextSettings = { ...settings, datesToRemember: patchRules(settings.datesToRemember, ruleId, origDate, patch) };
  let nextTransactions = transactions;
  if (transaction) {
    const existing = transactions.find(item => item?.id === transaction.id);
    if (existing) {
      if (existing.date !== transaction.date || Number(existing.amount) !== Number(transaction.amount) || existing.type !== transaction.type) {
        throw new Error("The linked transaction ID already belongs to different details. No payment was changed.");
      }
    } else {
      nextTransactions = prepareTransaction(transaction, transactions, settings);
      if (!Array.isArray(nextTransactions) || nextTransactions.filter(item => item?.id === transaction.id).length !== 1) {
        throw new Error("The linked transaction could not be prepared. No payment was changed.");
      }
    }
  } else if (removeTransactionId) {
    if (transactions.filter(item => item?.id === removeTransactionId).length > 1) throw new Error("Multiple linked transactions share an ID. No payment was changed.");
    nextTransactions = transactions.filter(item => item?.id !== removeTransactionId);
  }
  return { transactions: nextTransactions, settings: nextSettings };
}

export async function confirmAtomicDatePayment(options) {
  const { readRow, writeRow, onConfirmed } = options;
  const before = await readRow();
  const next = prepareDatePaymentRow(before, options);
  if (same(before.transactions, next.transactions) && same(before.settings, next.settings)) {
    onConfirmed(before);
    return;
  }
  try {
    await writeRow(next, before.updated_at ?? null);
  } catch (error) {
    let after;
    try { after = await readRow(); }
    catch { throw new Error("The payment result is uncertain. Reconnect and review the date and linked transaction before retrying.", { cause: error }); }
    if (!same(after.transactions, next.transactions) || !same(after.settings, next.settings)) {
      throw new Error("The payment was not confirmed. Review Dates to Remember and retry.", { cause: error });
    }
    onConfirmed(after);
    return;
  }
  onConfirmed({ ...before, ...next });
}
