const fs = require("fs");
const vm = require("vm");
const files = ["src/legacy-app.js", "src/legal.js", "src/accessibility.js"];
for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  new vm.Script(code, { filename: file });
  console.log("Syntax OK:", file);
}
