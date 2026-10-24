const generic = /^(?:UPI|DR|CR|PAY|PAID|PAYMENT|TO|FROM|TRANSFER|TXN|REF|P2P|P2A|COLLECT|REQUEST|BANK|MERCHANT|QR)$/i;
const handlePattern = /\b([a-z0-9][a-z0-9._-]{2,})@([a-z][a-z0-9.-]{2,})\b/gi;

function readable(value) {
  const cleaned = String(value || "").replace(/\b(?:UPI|DR|CR|PAYMENT|TRANSFER)\b/gi, " ").replace(/\b\d{4,}\b/g, " ").replace(/[_*]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned && /[a-z]{3}/i.test(cleaned) && !generic.test(cleaned) ? cleaned.slice(0, 60) : "";
}

export function extractUpiCounterparty(raw) {
  const text = String(raw || "");
  if (!/(?:^|[^a-z])UPI(?:$|[^a-z])/i.test(text)) return null;
  const handles = [...text.matchAll(handlePattern)];
  const handle = handles.find(match => !/^\d+$/.test(match[1]) && !generic.test(match[1]))?.[1] || "";
  const after = text.match(/\bUPI[\s/\-]*(?:DR|CR|OUT|IN)?[\s/\-]*(?:\d{6,}[\s/\-]*)?([^/\n]{2,60})/i)?.[1] || "";
  const beforeHandle = handles[0] ? text.slice(Math.max(0, handles[0].index - 70), handles[0].index).split(/[\/]/).at(-1) : "";
  const name = readable(after.replace(handlePattern, "")) || readable(beforeHandle) || readable(handle.replace(/[.\-]/g, " "));
  if (!name) return { name: "", categoryText: "" };
  return { name, categoryText: `${name} ${handle}`.toUpperCase() };
}
