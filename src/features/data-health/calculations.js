function clean(value) { return String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim(); }

export function inspectDataHealth(snapshot, now = new Date()) {
  const transactions = snapshot?.transactions;
  const documents = snapshot?.documents;
  const settings = snapshot?.settings;
  const findings = [];
  if (!Array.isArray(transactions)) findings.push({ key: "transactions-format", title: "Transactions have an unsupported saved format", detail: "The complete saved value needs manual review before any repair.", tab: "transactions", severity: "error", preview: { affected: "The saved transactions collection", proposed: "Compare with a checked backup before restoring the complete collection.", preserved: "No existing collection or sibling field will be replaced here." } });
  else {
    const groups = new Map();
    transactions.forEach((item, index) => {
      if (!item || typeof item !== "object" || !item.date || !item.merchant || !Number.isFinite(Number(item.amount)) || !["income", "expense"].includes(item.type)) {
        findings.push({ key: `transaction:${index}`, title: `Transaction entry ${index + 1} is incomplete`, detail: "Preview this saved entry in Transactions. No automatic cleanup is proposed.", tab: "transactions", severity: "error", targets: item?.id && transactions.filter(candidate => candidate?.id === item.id).length === 1 ? [{ id: item.id, label: `Entry ${index + 1}` }] : [], preview: { affected: `Saved transaction position ${index + 1}; ${item && typeof item === "object" ? `ID ${String(item.id || "missing")}` : "entry is not an object"}`, proposed: "Compare the entry with the original statement or a checked backup before correcting it.", preserved: "This entry and every neighbouring transaction remain unchanged." } });
        return;
      }
      const signature = [clean(item.date), clean(item.merchant), Number(item.amount).toFixed(2), clean(item.type), clean(item.account)].join("|");
      const siblings = groups.get(signature) || [];
      siblings.push({ index, id: item.id, merchant: item.merchant, date: item.date, amount: item.amount });
      groups.set(signature, siblings);
    });
    for (const siblings of groups.values()) if (siblings.length > 1) findings.push({ key: `duplicate:${siblings[0].index}`, title: `${siblings.length} possible duplicate transactions`, detail: siblings.map(item => `${item.date}: ${item.merchant} (${item.amount})`).join(" · "), tab: "transactions", severity: "warning", targets: siblings.filter(item => item.id && transactions.filter(candidate => candidate?.id === item.id).length === 1).map(item => ({ id: item.id, label: `Entry ${item.index + 1}` })), preview: { affected: siblings.map(item => `Position ${item.index + 1}, ID ${String(item.id || "missing")}: ${item.date}, ${item.merchant}, ${item.amount}`).join("; "), proposed: "Compare source statements and receipts. If one is genuinely extra, review and remove that exact transaction in Transactions.", preserved: "Every candidate remains saved until you choose and confirm a specific change." } });
  }
  if (!Array.isArray(documents)) findings.push({ key: "documents-format", title: "Documents have an unsupported saved format", detail: "Review the complete cloud value before restoring or deleting anything.", tab: "documents", severity: "error", preview: { affected: "The saved documents collection", proposed: "Compare with a checked backup before restoring the complete collection.", preserved: "No document or sibling field will be replaced here." } });
  else documents.forEach((item, index) => { if (!item || typeof item !== "object" || !item.id || !item.name) findings.push({ key: `document:${index}`, title: `Document entry ${index + 1} is incomplete`, detail: "The neighbouring entries are preserved. Review this item in Documents.", tab: "documents", severity: "error", preview: { affected: `Saved document position ${index + 1}; ${item && typeof item === "object" ? `ID ${String(item.id || "missing")}` : "entry is not an object"}`, proposed: "Compare the entry with the original file or a checked backup before correcting it.", preserved: "This entry and every neighbouring document remain unchanged." } }); });
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) findings.push({ key: "settings-format", title: "Settings have an unsupported saved format", detail: "No settings repair will run automatically.", tab: "settings", severity: "error", preview: { affected: "The saved settings object", proposed: "Compare with a checked backup before restoring settings.", preserved: "No saved setting will be replaced here." } });
  else {
    for (const field of ["datesToRemember", "nameRules", "rules", "goals", "recurring", "subscriptions", "budgets"]) {
      const value = settings[field];
      if (value != null && !Array.isArray(value)) findings.push({ key: `setting:${field}`, title: `${field} has an unsupported format`, detail: "The complete field is preserved. Review before editing.", tab: "settings", severity: "error", preview: { affected: `Settings field ${field}`, proposed: "Compare this field with a checked backup before restoring it.", preserved: "The current field and every unrelated setting remain unchanged." } });
      else if (Array.isArray(value)) value.forEach((item, index) => { if (!item || typeof item !== "object" || Array.isArray(item)) findings.push({ key: `setting:${field}:${index}`, title: `${field} entry ${index + 1} is malformed`, detail: "Other saved entries in this field remain untouched.", tab: "settings", severity: "error", preview: { affected: `Settings field ${field}, position ${index + 1}`, proposed: "Compare this one entry with a checked backup before correcting it.", preserved: "The entry and every sibling remain unchanged." } }); });
    }
    const lastBackup = settings.lastBackupAt ? new Date(settings.lastBackupAt) : null;
    const validBackup = lastBackup && Number.isFinite(lastBackup.getTime());
    const days = validBackup ? Math.floor((now.getTime() - lastBackup.getTime()) / 86400000) : null;
    findings.push({ key: "backup", title: days == null ? "No confirmed backup date is saved" : days > 3 ? `Last confirmed backup date was ${days} days ago` : "Backup date is recent", detail: "This date confirms the backup marker saved to FinLume; it cannot verify where the downloaded file is stored.", tab: "settings", severity: days == null || days > 3 ? "warning" : "info", preview: { affected: "Backup status marker", proposed: "Download a checked backup in Settings, then confirm the file is present in your chosen location.", preserved: "No saved financial data changes during this review." } });
  }
  return findings;
}
