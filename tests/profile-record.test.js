import test from "node:test";
import assert from "node:assert/strict";
import { readOwnProfile, updateDisplayName } from "../src/platform/profile-record.js";

function profileClient(result, calls) {
  return {
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return { eq(column, value) {
            calls.push(["eq", column, value]);
            return { maybeSingle: async () => result };
          } };
        },
        update(payload) {
          calls.push(["update", payload]);
          return { eq(column, value) {
            calls.push(["eq", column, value]);
            return { select: async columns => { calls.push(["select", columns]); return result; } };
          } };
        },
      };
    },
  };
}

test("shared profile name update requires the signed-in row", async () => {
  const calls = [];
  await updateDisplayName(profileClient({ data: [{ user_id: "me" }], error: null }, calls), "me", "Pat");
  assert.deepEqual(calls, [
    ["from", "profiles"], ["update", { display_name: "Pat" }],
    ["eq", "user_id", "me"], ["select", "user_id"],
  ]);
  for (const data of [[], null, [{ user_id: "other" }], [{ user_id: "me" }, { user_id: "me" }]]) {
    await assert.rejects(updateDisplayName(profileClient({ data, error: null }, []), "me", "Pat"), /not confirmed/);
  }
  await assert.rejects(updateDisplayName(profileClient({ data: null, error: new Error("offline") }, []), "me", "Pat"), /offline/);
});

test("profile read distinguishes a missing row from a failed request", async () => {
  assert.equal(await readOwnProfile(profileClient({ data: null, error: null }, []), "me"), null);
  await assert.rejects(readOwnProfile(profileClient({ data: null, error: new Error("offline") }, []), "me"), /offline/);
});
