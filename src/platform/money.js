// Currency-neutral two-decimal arithmetic. Persisted records remain in major
// units for backward compatibility; calculations convert at their boundary.
export function toMinor(value) {
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error("Invalid monetary amount");
  const whole = Number(match[2]);
  if (!Number.isSafeInteger(whole) || whole > Math.floor(Number.MAX_SAFE_INTEGER / 100)) throw new Error("Monetary amount is too large");
  const fraction = (match[3] || "").padEnd(3, "0");
  const cents = whole * 100 + Number(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1 : 0);
  if (!Number.isSafeInteger(cents)) throw new Error("Monetary amount is too large");
  return match[1] ? -cents : cents;
}

export function safeMinor(value) {
  try { return toMinor(value ?? 0); }
  catch { return 0; }
}

export function fromMinor(value) {
  if (!Number.isSafeInteger(value)) throw new Error("Invalid minor-unit amount");
  return value / 100;
}

export function sumMoney(values) {
  return fromMinor(values.reduce((sum, value) => sum + safeMinor(value), 0));
}
