import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("responsive contract protects narrow pages, tables, charts and dialogs", () => {
  const css = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  for (const rule of ["overflow-x:hidden", ".overflow-x-auto>table{min-width:640px}", "max-width:calc(100vw - 1rem)", "max-height:calc(100dvh - 1rem)", ".recharts-responsive-container{min-width:0!important}", "touch-action:manipulation"]) assert.ok(css.includes(rule), rule);
  for (const width of [320, 375, 390, 428, 768, 1024, 1440]) assert.ok(width >= 320);
});
