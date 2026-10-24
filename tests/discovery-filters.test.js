import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { activeDiscoveryFilters, discoverySources, importSessions, matchesDiscoveryFilters } from "../src/features/transactions/discovery-filters.js";

test("tag and source filters combine and older rows count as manual", () => {
  const rows = [
    { source: "csv", tags: ["Refund"] },
    { source: "pdf", tags: ["Refund"] },
    { tags: ["Transfer"] },
  ];
  deepEqual(rows.filter(row => matchesDiscoveryFilters(row, { tag: "Refund", source: "csv" })), [rows[0]]);
  deepEqual(discoverySources(rows), ["csv", "manual", "pdf"]);
  equal(matchesDiscoveryFilters(rows[2], { source: "manual" }), true);
});

test("an import session isolates only rows from that confirmed import", () => {
  const rows = [{ importSessionId: "one", source: "csv" }, { importSessionId: "two", source: "csv" }, { source: "csv" }];
  deepEqual(rows.filter(row => matchesDiscoveryFilters(row, { importSession: "one" })), [rows[0]]);
  deepEqual(importSessions(rows), ["two", "one"]);
});

test("active filters describe only applied constraints", () => {
  deepEqual(activeDiscoveryFilters({ search: " coffee ", account: "all", category: "all", tag: "Refund", source: "csv", reviewOnly: false, flaggedOnly: false, dateFrom: "", dateTo: "", amountMin: "", amountMax: "" }), ["Search: coffee", "Tag: Refund", "Source: csv"]);
});
