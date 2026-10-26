export const LOCALES = Object.freeze([
  { id: "en-IN", label: "English (India)" },
  { id: "en-US", label: "English (United States)" },
  { id: "en-GB", label: "English (United Kingdom)" },
  { id: "en-AU", label: "English (Australia)" },
  { id: "en-AE", label: "English (UAE)" }
]);

const allowed = new Set(LOCALES.map(item => item.id));
const supportedCurrencies = new Set(["INR", "AUD", "AED", "USD"]);
export function safeLocale(value) { return allowed.has(value) ? value : "en-IN"; }

export function localizedMoney(value, currency = "INR", locale = "en-IN") {
  const amount = Number(value);
  return new Intl.NumberFormat(safeLocale(locale), { style: "currency", currency: supportedCurrencies.has(currency) ? currency : "INR", maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
}

export function localizedDate(ymd, locale = "en-IN") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))) return ymd || "";
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ymd;
  return new Intl.DateTimeFormat(safeLocale(locale), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}
