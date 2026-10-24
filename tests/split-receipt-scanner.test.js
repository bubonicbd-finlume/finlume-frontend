import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createReceiptScannerModal } from "../src/features/split/receipt-scanner.js";

const icon = () => null;
const deps = {
  Button: ({ children }) => React.createElement("button", null, children),
  Modal: ({ open, title, children }) => open
    ? React.createElement("section", null, React.createElement("h2", null, title), children)
    : null,
  Receipt: icon,
};

test("Split receipt scanner opens at capture with its privacy guidance", () => {
  const ScannerModal = createReceiptScannerModal(deps);
  const html = renderToString(React.createElement(ScannerModal, {
    open: true,
    onClose() {},
    group: { id: "isolated-group" },
    members: [{ user_id: "isolated-user" }],
    session: { user: { id: "isolated-user" } },
    canLogForOthers: false,
    onDone() {},
  }));
  assert.match(html, /Scan Receipt/);
  assert.match(html, /Scan a receipt/);
  assert.match(html, /nothing is uploaded until you save/);
  assert.match(html, /Capture receipt/);
});
