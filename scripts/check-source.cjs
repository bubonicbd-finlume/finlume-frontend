const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(candidate);
    return entry.isFile() && entry.name.endsWith(".js") ? [candidate] : [];
  });
}

for (const file of javascriptFiles("src")) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  console.log("Syntax OK:", file);
}
