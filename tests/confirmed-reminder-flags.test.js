import test from "node:test";
import assert from "node:assert/strict";
import { confirmReminderFlags } from "../src/platform/confirmed-reminder-flags.js";

test("reminder flags merge with freshly saved flags", async () => {
  let cloud = { notifiedDates: ["other"], theme: "dark" };
  let visible = cloud;
  await confirmReminderFlags(["date:one"], {
    readSettings: async () => cloud,
    saveSettings: async next => { cloud = next; return true; },
    setSettings: next => { visible = next; },
  });
  assert.deepEqual(visible.notifiedDates, ["other", "date:one"]);
  assert.equal(visible.theme, "dark");
});

test("a lost flag-save response is recognized without another write", async () => {
  let cloud = { notifiedDates: [] };
  let writes = 0;
  const context = {
    readSettings: async () => cloud,
    saveSettings: async next => { cloud = next; writes += 1; return false; },
    setSettings: () => {},
  };
  await confirmReminderFlags(["date:one"], context);
  await confirmReminderFlags(["date:one"], context);
  assert.equal(writes, 1);
});

test("a rejected flag save stays pending for retry", async () => {
  const cloud = { notifiedDates: [] };
  let visible;
  await assert.rejects(confirmReminderFlags(["date:one"], {
    readSettings: async () => cloud,
    saveSettings: async () => false,
    setSettings: next => { visible = next; },
  }), /not confirmed/);
  assert.deepEqual(visible, cloud);
});

test("malformed saved flags stop before overwriting them", async () => {
  let writes = 0;
  await assert.rejects(confirmReminderFlags(["date:one"], {
    readSettings: async () => ({ notifiedDates: { bad: true } }),
    saveSettings: async () => { writes += 1; return true; },
    setSettings: () => {},
  }), /unsupported format/);
  assert.equal(writes, 0);
});
