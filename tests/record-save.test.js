import test from "node:test";
import assert from "node:assert/strict";
import { updateUserDataField, updateUserDataFields } from "../src/platform/record-save.js";

function clientWithResult(result, calls) {
  return {
    from(table) {
      calls.push(["from", table]);
      return {
        update(payload) {
          calls.push(["update", payload]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return { select: async columns => { calls.push(["select", columns]); return result; } };
            },
          };
        },
      };
    },
  };
}

test("Finance save status requires one confirmed account row", async () => {
  const calls = [];
  await updateUserDataField(clientWithResult({ data: [{ user_id: "me" }], error: null }, calls), "me", "transactions", [], "2026-10-20T00:00:00.000Z");
  assert.deepEqual(calls, [
    ["from", "ledgerly_data"],
    ["update", { transactions: [], updated_at: "2026-10-20T00:00:00.000Z" }],
    ["eq", "user_id", "me"],
    ["select", "user_id"],
  ]);
  for (const data of [[], null, [{ user_id: "other" }], [{ user_id: "me" }, { user_id: "me" }]]) {
    await assert.rejects(updateUserDataField(clientWithResult({ data, error: null }, []), "me", "settings", {}, "now"), /not confirmed/);
  }
  await assert.rejects(updateUserDataField(clientWithResult({ data: null, error: new Error("Offline") }, []), "me", "settings", {}, "now"), /Offline/);
});

test("version checked saves reject a stale account row without claiming success", async () => {
  const calls = [];
  const query = {
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    is(column, value) { calls.push(["is", column, value]); return this; },
    async select(columns) { calls.push(["select", columns]); return { data: [], error: null }; },
  };
  const client = { from(table) { calls.push(["from", table]); return { update(payload) { calls.push(["update", payload]); return query; } }; } };
  await assert.rejects(updateUserDataField(client, "me", "transactions", [], "next", "old"), /changed in another tab or device/);
  assert.deepEqual(calls.slice(2), [["eq", "user_id", "me"], ["eq", "updated_at", "old"], ["select", "user_id, updated_at"]]);
  calls.length = 0;
  await assert.rejects(updateUserDataField(client, "me", "settings", {}, "next", null), /changed in another tab or device/);
  assert.ok(calls.some(call => call[0] === "is" && call[1] === "updated_at" && call[2] === null));
});

test("version checked save returns the confirmed cloud timestamp", async () => {
  const query = {
    eq() { return this; },
    async select() { return { data: [{ user_id: "me", updated_at: "2026-10-23T10:00:00Z" }], error: null }; },
  };
  const client = { from() { return { update() { return query; } }; } };
  assert.equal(await updateUserDataField(client, "me", "transactions", [], "2026-10-23T10:00:00Z", "2026-10-23T09:00:00Z"), "2026-10-23T10:00:00Z");
});

test("two devices using the same version cannot overwrite the winner", async () => {
  const row = { user_id: "me", transactions: [{ id: "original" }], updated_at: "v1" };
  const client = { from() { return { update(patch) { const filters = {}; return {
    eq(column, value) { filters[column] = value; return this; },
    async select() {
      if (filters.user_id !== row.user_id || filters.updated_at !== row.updated_at) return { data: [], error: null };
      Object.assign(row, patch);
      return { data: [{ user_id: row.user_id, updated_at: row.updated_at }], error: null };
    },
  }; } }; } };
  await updateUserDataField(client, "me", "transactions", [{ id: "first" }], "v2", "v1");
  await assert.rejects(updateUserDataField(client, "me", "transactions", [{ id: "second" }], "v3", "v1"), /changed in another tab or device/);
  assert.deepEqual(row.transactions, [{ id: "first" }]);
});

test("linked payment sends transactions and settings in one version-checked update", async () => {
  const calls = [];
  const query = {
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    async select() { return { data: [{ user_id: "me", updated_at: "v2" }], error: null }; },
  };
  const client = { from() { return { update(payload) { calls.push(["update", payload]); return query; } }; } };
  const fields = { transactions: [{ id: "date:one" }], settings: { datesToRemember: [] } };
  assert.equal(await updateUserDataFields(client, "me", fields, "v2", "v1"), "v2");
  assert.deepEqual(calls, [["update", { ...fields, updated_at: "v2" }], ["eq", "user_id", "me"], ["eq", "updated_at", "v1"]]);
  await assert.rejects(updateUserDataFields(client, "me", { role: "admin" }, "v3", "v2"), /Unsupported account fields/);
});
