export function inspectBackupDocuments(value) {
  if (value === undefined) return { valid: [], invalidCount: 0 };
  if (!Array.isArray(value)) return { valid: [], invalidCount: 1 };
  const seen = new Set();
  const valid = [];
  let invalidCount = 0;
  for (const doc of value) {
    const encrypted = doc?.encrypted;
    const okay = doc && typeof doc === "object" && !Array.isArray(doc)
      && typeof doc.id === "string" && doc.id.trim() && !seen.has(doc.id)
      && typeof doc.filename === "string" && doc.filename.trim()
      && typeof doc.createdAt === "string" && !Number.isNaN(Date.parse(doc.createdAt))
      && typeof doc.size === "number" && Number.isFinite(doc.size) && doc.size >= 0
      && (doc.dataUrl == null || typeof doc.dataUrl === "string" && doc.dataUrl.startsWith("data:"))
      && (encrypted == null || typeof encrypted === "object" && typeof encrypted.iv === "string" && typeof encrypted.ct === "string");
    if (!okay) { invalidCount++; continue; }
    seen.add(doc.id);
    valid.push(doc);
  }
  return { valid, invalidCount };
}

export function canReplaceBackup({ invalidTransactions, invalidDocuments, withDocuments }) {
  return invalidTransactions === 0 && (!withDocuments || invalidDocuments === 0);
}
