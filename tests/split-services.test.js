import test from "node:test";
import assert from "node:assert/strict";
import { createSplitServices } from "../src/features/split/services.js";

test("Split services retain group and settlement RPC arguments", async () => {
  const calls = [];
  const services = createSplitServices({
    supabaseClient: {
      rpc: async (name, args) => {
        calls.push([name, args]);
        return { data: name === "krnshare_list_groups" ? [{ id: "group-1" }] : true, error: null };
      },
    },
  });
  assert.deepEqual(await services.ksListGroups(), [{ id: "group-1" }]);
  assert.equal(await services.ksRecordSettlement({ groupId: "group-1", fromId: "a", toId: "b", amount: 25 }), true);
  assert.deepEqual(calls, [
    ["krnshare_list_groups", undefined],
    ["krnshare_record_settlement", { p_group: "group-1", p_from: "a", p_to: "b", p_amount: 25, p_note: null }],
  ]);
});

test("Split expense creation keeps its older RPC fallback", async () => {
  const calls = [];
  const services = createSplitServices({
    supabaseClient: {
      rpc: async (name, args) => {
        calls.push([name, args]);
        if (calls.length === 1) return { error: { code: "PGRST202" } };
        return { data: "expense-1", error: null };
      },
    },
  });
  const result = await services.ksAddExpense({ groupId: "g", payerId: "a", category: "Food", amount: 12, date: "2026-10-19", method: "equal", splits: [], merchant: "Cafe" });
  assert.equal(result, "expense-1");
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].p_merchant, "Cafe");
  assert.equal("p_merchant" in calls[1][1], false);
});

test("Split balance mapping and direct debts keep their saved data shape", async () => {
  const services = createSplitServices({
    supabaseClient: {
      rpc: async () => ({ data: [{ user_id: "a", display_name: "Alex", paid_amount: "30", owed_amount: "10", net_amount: "20", simplified_list_json: [{ from_id: "b", to_id: "a", amount: "20" }] }], error: null }),
    },
  });
  assert.deepEqual(await services.ksComputeBalances("g"), {
    people: [{ user_id: "a", display_name: "Alex", paid: 30, owed: 10, net: 20 }],
    simplified: [{ from_id: "b", from_name: undefined, to_id: "a", to_name: undefined, amount: 20 }],
  });
  assert.deepEqual(services.ksComputeDirectDebts([{ payer_id: "a", splits_json: [{ user_id: "b", share_amount: 20 }] }], [], [{ user_id: "a", display_name: "Alex" }, { user_id: "b", display_name: "Blair" }]), [
    { from_id: "b", from_name: "Blair", to_id: "a", to_name: "Alex", amount: 20 },
  ]);
});

test("Split budget and archive writes report cloud failures", async () => {
  const writes = [];
  const services = createSplitServices({
    supabaseClient: {
      from: table => ({
        upsert: async (rows, options) => {
          writes.push({ table, rows, options });
          return { error: new Error("connection lost") };
        },
      }),
    },
  });
  await assert.rejects(services.ksSaveBudget("group-1", 500), /connection lost/);
  await assert.rejects(services.ksSetGroupArchived("user-1", "group-1", true), /connection lost/);
  assert.equal(writes[0].table, "ks_group_settings");
  assert.equal(writes[0].rows[0].budget, 500);
  assert.equal(writes[1].table, "ks_user_group_prefs");
  assert.equal(writes[1].rows[0].archived, true);
});

test("Split preference reads distinguish empty records from failed requests", async () => {
  let result = { data: null, error: null };
  const query = {
    select() { return this; },
    eq() { return this; },
    maybeSingle() { return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  const services = createSplitServices({ supabaseClient: { from: () => query } });
  assert.equal(await services.ksGetBudget("g"), null);
  assert.deepEqual([...await services.ksGetArchivedIds("u")], []);
  result = { data: { budget: "400" }, error: null };
  assert.equal(await services.ksGetBudget("g"), 400);
  result = { data: [{ group_id: "g" }], error: null };
  assert.deepEqual([...await services.ksGetArchivedIds("u")], ["g"]);
  result = { data: null, error: new Error("offline") };
  await assert.rejects(services.ksGetBudget("g"), /offline/);
  await assert.rejects(services.ksGetArchivedIds("u"), /offline/);
});

test("guest balances keep settlement effects and ignore deleted settlements", () => {
  const services = createSplitServices({ supabaseClient: {} });
  const result = services.ksComputeGuestSettlement(
    [{ id: "member" }, { id: "guest:1" }],
    [{ payerId: "member", amount: 100, splits: [{ id: "member", share: 50 }, { id: "guest:1", share: 50 }] }],
    [{ fromId: "guest:1", toId: "member", amount: 20 }, { fromId: "guest:1", toId: "member", amount: 40, deleted: true }],
  );
  assert.deepEqual(result.transfers, [{ from: "guest:1", to: "member", amount: 30 }]);
  assert.equal(result.net.get("member"), 30);
});

test("guest history migration keeps the guest expense when the real expense write fails", async () => {
  const operations = [];
  const row = { id: "expense-1", payer_id: "guest:1", category: "Food", amount: 40, description: "Lunch", expense_date: "2026-10-19", split_method: "equal", splits: [{ id: "guest:1", share: 20 }, { id: "member", share: 20 }] };
  const supabaseClient = {
    rpc: async name => name === "krnshare_add_expense" ? { error: new Error("offline") } : { data: null, error: null },
    from: table => {
      const query = {
        select() { return this; },
        eq() { return this; },
        order() { return Promise.resolve({ data: table === "ks_guest_expenses" ? [row] : [], error: null }); },
        update(value) { operations.push(["update", table, value]); return this; },
        delete() { operations.push(["delete", table]); return this; },
        then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  const services = createSplitServices({ supabaseClient });
  assert.deepEqual(await services.ksMigrateGuestHistory("group-1", "guest:1", "new-member", "actor"), { migrated: 0, remaining: 1, failed: 1, settlementFailed: 0 });
  assert.equal(operations.some(([action]) => action === "delete"), false);
  assert.equal(operations[0][2].payer_id, "new-member");
});

test("guest history migration reports a rejected settlement update", async () => {
  const settlement = { id: "settlement-1", from_id: "guest:1", to_id: "member", amount: 12 };
  const calls = [];
  const services = createSplitServices({
    supabaseClient: {
      from: table => ({
        select() { return this; },
        update(value) { calls.push([table, value]); return this; },
        eq() { return this; },
        order() { return Promise.resolve({ data: table === "ks_guest_settlements" ? [settlement] : [], error: null }); },
        then(resolve, reject) { return Promise.resolve({ error: new Error("settlement update denied") }).then(resolve, reject); },
      }),
    },
  });
  assert.deepEqual(await services.ksMigrateGuestHistory("group-1", "guest:1", "member-1", "actor"), { migrated: 0, remaining: 0, failed: 0, settlementFailed: 1 });
  assert.deepEqual(calls, [["ks_guest_settlements", { from_id: "member-1", to_id: "member" }]]);
});

test("guest claim save waits for confirmation and reports a rejected write", async () => {
  let result = { error: new Error("permission denied") };
  const writes = [];
  const services = createSplitServices({
    supabaseClient: {
      from: table => ({
        upsert: async (rows, options) => {
          writes.push({ table, rows, options });
          return result;
        },
      }),
    },
  });
  await assert.rejects(services.ksSaveGuestClaim("group-1", "guest-1", "friend@example.test"), /permission denied/);
  result = { error: null };
  await services.ksSaveGuestClaim("group-1", "guest-1", "friend@example.test");
  assert.equal(writes[0].table, "ks_guest_claims");
  assert.deepEqual(writes[0].options, { onConflict: "group_id,guest_id" });
  assert.equal(writes[0].rows[0].email, "friend@example.test");
});

test("failed guest-expense reads stop history migration before any writes", async () => {
  let writes = 0;
  const query = {
    select() { return this; },
    eq() { return this; },
    order() { return Promise.resolve({ data: null, error: new Error("guest list unavailable") }); },
  };
  const services = createSplitServices({
    supabaseClient: {
      from: () => query,
      rpc: async () => { writes++; return { data: null, error: null }; },
    },
  });
  await assert.rejects(services.ksListGuestExpenses("group-1"), /guest list unavailable/);
  await assert.rejects(services.ksMigrateGuestHistory("group-1", "guest:1", "member-1", "actor"), /guest list unavailable/);
  assert.equal(writes, 0);
});

test("failed guest-settlement reads stop migration before expense writes", async () => {
  let writes = 0;
  const expense = { id: "expense-1", payer_id: "guest:1", category: "Food", amount: 20, expense_date: "2026-10-19", split_method: "equal", splits: [{ id: "guest:1", share: 20 }] };
  const supabaseClient = {
    from: table => ({
      select() { return this; },
      eq() { return this; },
      order() { return Promise.resolve(table === "ks_guest_settlements" ? { data: null, error: new Error("settlement list unavailable") } : { data: [expense], error: null }); },
      update() { writes++; return this; },
      delete() { writes++; return this; },
    }),
    rpc: async () => { writes++; return { data: true, error: null }; },
  };
  const services = createSplitServices({ supabaseClient });
  await assert.rejects(services.ksListGuestSettlements("group-1"), /settlement list unavailable/);
  await assert.rejects(services.ksMigrateGuestHistory("group-1", "guest:1", "member-1", "actor"), /settlement list unavailable/);
  assert.equal(writes, 0);
});

test("guest roster and claims distinguish empty data from failed requests", async () => {
  const results = {
    ks_guests: { data: [{ id: "1", name: "Avery" }], error: null },
    ks_guest_claims: { data: [{ guest_id: "1", email: "avery@example.test", linked_at: "2026-10-19" }], error: null },
  };
  const services = createSplitServices({
    supabaseClient: {
      from: table => ({
        select() { return this; },
        eq() { return this; },
        order() { return Promise.resolve(results[table]); },
        then(resolve, reject) { return Promise.resolve(results[table]).then(resolve, reject); },
      }),
    },
  });
  assert.deepEqual(await services.ksListGuests("group-1"), [{ id: "guest:1", name: "Avery" }]);
  assert.deepEqual(await services.ksGetGuestClaims("group-1"), { "1": { email: "avery@example.test", linkedAt: "2026-10-19" } });
  results.ks_guests = { data: [], error: null };
  results.ks_guest_claims = { data: [], error: null };
  assert.deepEqual(await services.ksListGuests("group-1"), []);
  assert.deepEqual(await services.ksGetGuestClaims("group-1"), {});
  results.ks_guests = { data: null, error: new Error("roster offline") };
  results.ks_guest_claims = { data: null, error: new Error("claims offline") };
  await assert.rejects(services.ksListGuests("group-1"), /roster offline/);
  await assert.rejects(services.ksGetGuestClaims("group-1"), /claims offline/);
});
