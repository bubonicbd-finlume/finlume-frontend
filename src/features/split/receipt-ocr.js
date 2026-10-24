import Tesseract from "tesseract.js";

export function localOcrOptions(onProgress, baseUrl = import.meta.env?.BASE_URL || "/") {
  const base = `${baseUrl.replace(/\/?$/, "/")}ocr/`;
  return {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    workerBlobURL: false,
    logger: (message) => {
      if (onProgress && message.status === "recognizing text") onProgress(message.progress || 0);
    },
  };
}

export async function recognizeReceipt(imageDataUrl, onProgress, createWorker = Tesseract.createWorker) {
  const worker = await createWorker("eng", Tesseract.OEM.LSTM_ONLY, localOcrOptions(onProgress));
  try {
    const { data } = await worker.recognize(imageDataUrl);
    return {
      rawText: data.text || "",
      confidence: typeof data.confidence === "number" ? data.confidence : 50,
    };
  } finally {
    await worker.terminate();
  }
}
