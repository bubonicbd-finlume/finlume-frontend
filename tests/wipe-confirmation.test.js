import test from "node:test";
import assert from "node:assert/strict";
import { confirmWipeWrites } from "../src/platform/wipe-confirmation.js";

test("erase confirmation waits for every write and rejects partial success", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  let settled = false;
  const wiping = confirmWipeWrites([async () => false, async () => pending]);
  wiping.finally(() => { settled = true; }).catch(() => {});
  await Promise.resolve();
  assert.equal(settled, false);
  finish(true);
  await assert.rejects(wiping, /may be partial/);
  assert.equal(settled, true);
  await confirmWipeWrites([async () => true, async () => true]);
  await assert.rejects(confirmWipeWrites([async () => true, async () => { throw new Error("Offline"); }]), /may be partial/);
});
