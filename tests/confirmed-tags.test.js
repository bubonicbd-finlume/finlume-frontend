import test from "node:test";
import assert from "node:assert/strict";
import { confirmTagRegistration } from "../src/features/transactions/confirmed-tags.js";

test("new transaction tags register in account settings after confirmation", async () => {
  let visible;
  await confirmTagRegistration(["Travel", "Family"], {
    readSettings: async () => ({ tags: ["Travel"] }),
    saveSettings: async () => true,
    setSettings: value => { visible = value; },
  });
  assert.deepEqual(visible.tags, ["Travel", "Family"]);
});

test("lost response and retry do not duplicate registered tags", async () => {
  let cloud = { tags: [] };
  let writes = 0;
  const context = {
    readSettings: async () => cloud,
    saveSettings: async value => { cloud = value; writes++; return false; },
    setSettings: () => {},
  };
  await confirmTagRegistration(["Travel"], context);
  await confirmTagRegistration(["Travel"], context);
  assert.equal(writes, 1);
  assert.deepEqual(cloud.tags, ["Travel"]);
});

test("failed tag registration reports the partial result for retry", async () => {
  let visible;
  await assert.rejects(confirmTagRegistration(["Travel"], {
    readSettings: async () => ({ tags: [] }),
    saveSettings: async () => false,
    setSettings: value => { visible = value; },
  }), /transaction tags were saved/);
  assert.deepEqual(visible.tags, []);
});
