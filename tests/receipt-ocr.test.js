import test from "node:test";
import assert from "node:assert/strict";
import { localOcrOptions, recognizeReceipt } from "../src/features/split/receipt-ocr.js";

test("receipt OCR uses local worker, core, and language assets", () => {
  const progress = [];
  const options = localOcrOptions((value) => progress.push(value), "/finlume/");
  assert.equal(options.workerPath, "/finlume/ocr/worker.min.js");
  assert.equal(options.corePath, "/finlume/ocr/core");
  assert.equal(options.langPath, "/finlume/ocr/lang");
  assert.equal(options.workerBlobURL, false);
  options.logger({ status: "loading language traineddata", progress: 0.3 });
  options.logger({ status: "recognizing text", progress: 0.7 });
  assert.deepEqual(progress, [0.7]);
});

test("receipt OCR returns text and confidence and releases its worker", async () => {
  let calls = 0;
  const createWorker = async (language, engine, options) => {
    assert.equal(language, "eng");
    assert.equal(engine, 1);
    assert.equal(options.workerPath, "/ocr/worker.min.js");
    return {
      recognize: async (image) => {
        assert.equal(image, "data:image/png;base64,AA==");
        return { data: { text: "Total 123.45", confidence: 92 } };
      },
      terminate: async () => { calls += 1; },
    };
  };
  assert.deepEqual(await recognizeReceipt("data:image/png;base64,AA==", null, createWorker), {
    rawText: "Total 123.45",
    confidence: 92,
  });
  assert.equal(calls, 1);
});

test("receipt OCR releases its worker when recognition fails", async () => {
  let terminated = false;
  const createWorker = async () => ({
    recognize: async () => { throw new Error("Image unreadable"); },
    terminate: async () => { terminated = true; },
  });
  await assert.rejects(recognizeReceipt("bad-image", null, createWorker), /Image unreadable/);
  assert.equal(terminated, true);
});
