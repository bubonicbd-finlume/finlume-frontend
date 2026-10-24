import test from "node:test";
import assert from "node:assert/strict";
import { confirmDocumentMutation } from "../src/features/documents/confirmed-mutation.js";

const doc = { id: "doc-1", filename: "sample.pdf" };
const add = before => ({ next: [doc, ...before], changed: true });
const hasDoc = after => after.some(item => item.id === doc.id);

test("document upload becomes visible only after a confirmed save", async () => {
  let shown;
  await confirmDocumentMutation({
    readDocuments: async () => [], makeChange: add,
    saveDocuments: async next => { assert.equal(shown, undefined); assert.deepEqual(next, [doc]); return true; },
    setDocuments: value => { shown = value; }, isConfirmed: hasDoc,
  });
  assert.deepEqual(shown, [doc]);
});

test("document write recovers a commit whose response was lost", async () => {
  let reads = 0;
  const result = await confirmDocumentMutation({
    readDocuments: async () => ++reads === 1 ? [] : [doc], makeChange: add,
    saveDocuments: async () => false, setDocuments: () => {}, isConfirmed: hasDoc,
  });
  assert.equal(reads, 2);
  assert.equal(result.changed, true);
});

test("failed document delete refreshes the list and refuses success", async () => {
  let shown;
  await assert.rejects(confirmDocumentMutation({
    readDocuments: async () => [doc],
    makeChange: before => ({ next: before.filter(item => item.id !== doc.id), changed: true }),
    saveDocuments: async () => false, setDocuments: value => { shown = value; },
    isConfirmed: after => after.every(item => item.id !== doc.id),
  }), /not confirmed/);
  assert.deepEqual(shown, [doc]);
});

test("uncertain document write does not claim completion", async () => {
  let reads = 0;
  await assert.rejects(confirmDocumentMutation({
    readDocuments: async () => { if (++reads === 2) throw new Error("offline"); return []; },
    makeChange: add, saveDocuments: async () => false,
    setDocuments: () => {}, isConfirmed: hasDoc,
  }), /could not be confirmed/);
});
