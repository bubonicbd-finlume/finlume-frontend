const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const root = path.resolve(__dirname, "..");
const required = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ...[
    "tesseract-core.wasm.js",
    "tesseract-core-simd.wasm.js",
    "tesseract-core-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm.js",
  ].map((name) => [`tesseract.js-core/${name}`, `core/${name}`]),
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "lang/eng.traineddata.gz"],
];
const digest = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
for (const [packageFile, outputFile] of required) {
  const built = path.join(root, "dist", "ocr", ...outputFile.split("/"));
  const source = path.join(root, "node_modules", ...packageFile.split("/"));
  if (!fs.existsSync(built) || digest(built) !== digest(source)) {
    throw new Error(`Production OCR asset is missing or differs from its pinned dependency: ${outputFile}`);
  }
}
console.log(`Verified ${required.length} OCR assets in the production build.`);
