// Spreadsheet-oriented CSV exports need formula-like text prefixed with a tab
// inside a quoted field. Numeric values remain numbers.
export function safeCsvValue(value) {
  if (value == null) return "";
  if (typeof value !== "string") return value;
  return /^[\t\r\n]|^\s*[=+\-@＝＋－＠]/u.test(value) ? `\t${value}` : value;
}
