import test from "node:test";
import assert from "node:assert/strict";
import { safeProfiles, validSignupDates } from "../src/features/admin/safe-profiles.js";

test("Admin ignores malformed profile rows and invalid signup dates", () => {
  const profiles = safeProfiles([null, "bad", { id: "one", created_at: "not a date" },
    { id: "two", created_at: "2026-10-20" }, { id: "three", created_at: "2030-01-01" }]);
  assert.equal(profiles.length, 3);
  assert.deepEqual(validSignupDates(profiles, new Date("2026-10-22T00:00:00Z")).map(d => d.toISOString().slice(0, 10)), ["2026-10-20"]);
  assert.deepEqual(safeProfiles({ unexpected: true }), []);
});
