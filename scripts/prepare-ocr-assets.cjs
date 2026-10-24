const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "public", "ocr");
const assets = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ...[
    "tesseract-core.wasm.js",
    "tesseract-core-simd.wasm.js",
    "tesseract-core-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm.js",
  ].map((name) => [`tesseract.js-core/${name}`, `core/${name}`]),
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "lang/eng.traineddata.gz"],
];

for (const [packageFile, outputFile] of assets) {
  const source = path.join(root, "node_modules", ...packageFile.split("/"));
  const destination = path.join(target, ...outputFile.split("/"));
  if (!fs.existsSync(source)) throw new Error(`Missing OCR dependency file: ${packageFile}. Run npm install.`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

console.log(`Prepared ${assets.length} local OCR assets.`);
