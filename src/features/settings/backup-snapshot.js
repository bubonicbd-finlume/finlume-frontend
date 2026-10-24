export async function readConfirmedBackupSnapshot(readRow) {
  const row = await readRow();
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("The cloud backup data could not be read. No file was downloaded.");
  }
  if (!["transactions", "documents", "settings"].every(key => Object.hasOwn(row, key))) {
    throw new Error("The cloud backup data is incomplete. No file was downloaded.");
  }
  const transactions = row?.transactions ?? [];
  const documents = row?.documents ?? [];
  const settings = row?.settings ?? {};
  if (!Array.isArray(transactions) || !Array.isArray(documents)
    || !settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("The cloud backup data has an unexpected format. No file was downloaded.");
  }
  return { transactions, documents, settings };
}
