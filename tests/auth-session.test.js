import test from "node:test";
import assert from "node:assert/strict";
import { readInitialSession } from "../src/platform/auth-session.js";

test("initial session check distinguishes signed out from a failed request", async () => {
  const session = { user: { id: "test-user" } };
  assert.equal(await readInitialSession({ getSession: async () => ({ data: { session } }) }), session);
  assert.equal(await readInitialSession({ getSession: async () => ({ data: { session: null } }) }), null);
  await assert.rejects(readInitialSession({ getSession: async () => ({ error: new Error("Refresh unavailable") }) }), /Refresh unavailable/);
  await assert.rejects(readInitialSession({ getSession: async () => { throw new Error("Offline"); } }), /Offline/);
});
