import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MonthSelector } from "../src/platform/month-selector.js";
import { extractUpiCounterparty } from "../src/platform/upi-narration.js";
import { calculatePurchasePlan } from "../src/features/goals/purchase-plan.js";

test("month selector bounds a multi-year history to one year's months", () => {
  const months = Array.from({ length: 72 }, (_, index) => `${2021 + Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`);
  const html = renderToStaticMarkup(React.createElement(MonthSelector, { months, value: "2024-05", onChange: () => {} }));
  assert.equal((html.match(/<option/g) || []).length, 18);
  assert.match(html, /Month year/);
  assert.match(html, /Month month/);
});

test("UPI counterparty extraction prefers a named payee and avoids numeric handles", () => {
  assert.match(extractUpiCounterparty("UPI/DR/123456789012/DOMINOS/YESB/paytm-5195/UPI").categoryText, /DOMINOS/);
  assert.match(extractUpiCounterparty("collect/foo.bakery@okbank/UPI/9988776655").categoryText, /BAKERY/);
  assert.equal(extractUpiCounterparty("UPI/DR/123456789012/9876543210@okbank/REF").categoryText, "");
});

test("purchase plan compares the total paid with the cash target", () => {
  assert.deepEqual(calculatePurchasePlan({ price: 50000, saved: 10000, months: 4, monthlyRoom: 8000, instalment: 4800, instalmentMonths: 12, fees: 1000 }), {
    monthlyNeeded: 10000, remaining: 40000, monthlyGap: 2000, payLaterTotal: 58600, extraCost: 8600
  });
});
