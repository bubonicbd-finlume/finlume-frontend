import test from "node:test";
import assert from "node:assert/strict";
import Papa from "papaparse";
import { safeCsvValue } from "../src/platform/csv-export.js";
import { createAdminServices } from "../src/features/admin/services.js";

test("CSV export guards formula-like text after leading whitespace", () => {
  for (const prefix of ["=", "+", "-", "@", "＝", "＋", "－", "＠", "  =", "\t=", "\r=", "\n="]) {
    assert.equal(safeCsvValue(`${prefix}SUM(1,1)`), `\t${prefix}SUM(1,1)`);
  }
  assert.equal(safeCsvValue("\tordinary text"), "\t\tordinary text");
  assert.equal(safeCsvValue("Ordinary text"), "Ordinary text");
  assert.equal(safeCsvValue(-42.5), -42.5);
  assert.equal(safeCsvValue(null), "");
});

test("Transaction CSV places the guard inside a quoted cell", () => {
  const csv = Papa.unparse([{ Merchant: safeCsvValue("=SUM(1,1)"), Amount: "15.00" }], { quotes: true });
  assert.equal(csv, '"Merchant","Amount"\r\n"\t=SUM(1,1)","15.00"');
});

test("Administration CSV quotes guarded cells without changing numeric amounts", async () => {
  const previousDocument = globalThis.document;
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;
  const previousTimeout = globalThis.setTimeout;
  let blob;
  let clicked = false;
  const anchor = { click() { clicked = true; }, remove() {} };
  try {
    globalThis.document = { createElement: () => anchor, body: { appendChild() {} } };
    URL.createObjectURL = value => { blob = value; return "blob:test"; };
    URL.revokeObjectURL = () => {};
    globalThis.setTimeout = callback => { callback(); return 0; };
    createAdminServices({}).adminDownloadCsv([["Name", "Amount"], [" =SUM(1,1)", -5], ['A,"B"', 12]], "admin.csv");
    assert.equal(anchor.download, "admin.csv");
    assert.equal(clicked, true);
    assert.equal(await blob.text(), 'Name,Amount\n"\t =SUM(1,1)",-5\n"A,""B""",12');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    URL.createObjectURL = previousCreate;
    URL.revokeObjectURL = previousRevoke;
    globalThis.setTimeout = previousTimeout;
  }
});
