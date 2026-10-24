import test from "node:test";
import assert from "node:assert/strict";
import { markAllNotificationsRead, markNotificationRead, readNotifications } from "../src/platform/notifications.js";

function clientWithResult(result, calls) {
  const query = {
    select(...args) { calls.push(["select", ...args]); return this; },
    update(...args) { calls.push(["update", ...args]); return this; },
    eq(...args) { calls.push(["eq", ...args]); return this; },
    order(...args) { calls.push(["order", ...args]); return this; },
    limit(...args) { calls.push(["limit", ...args]); return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return { from(table) { calls.push(["from", table]); return query; } };
}

test("notification read distinguishes an empty list from a failed request", async () => {
  const calls = [];
  const empty = await readNotifications(clientWithResult({ data: [], error: null }, calls), "user-1");
  assert.deepEqual(empty, []);
  assert.deepEqual(calls.at(-1), ["limit", 30]);
  await assert.rejects(readNotifications(clientWithResult({ data: null, error: new Error("offline") }, []), "user-1"), /offline/);
});

test("marking notifications read waits for the cloud response", async () => {
  const calls = [];
  await markNotificationRead(clientWithResult({ error: null }, calls), "notice-1");
  assert.deepEqual(calls.slice(-2), [["update", { read: true }], ["eq", "id", "notice-1"]]);
  await assert.rejects(markAllNotificationsRead(clientWithResult({ error: new Error("offline") }, []), "user-1"), /offline/);
});
