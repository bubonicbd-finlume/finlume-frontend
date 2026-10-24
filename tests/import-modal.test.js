import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createImportCsvModal } from "../src/features/transactions/import-modal.js";
import { MAX_STATEMENT_FILE_BYTES, statementFileSizeError } from "../src/features/transactions/import-limits.js";

const icon = () => null;
const deps = {
  ACCOUNT_TYPE_OPTIONS: [{ id: "primary", label: "Primary account" }],
  AlertTriangle: icon, BACKEND_CONFIG: { enabled: false },
  Button: ({ children }) => React.createElement("button", null, children),
  Check: icon,
  Field: ({ label, children }) => React.createElement("div", null, label, children),
  Loader2: icon,
  Modal: ({ open, title, children }) => open
    ? React.createElement("div", null, title, children) : null,
  ShieldCheck: icon, crossCheckCsvSummary: () => null, enrichNarration: () => ({}),
  extractPdfStatementRows: async () => ({ rows: [] }),
  formatCurrency: n => `₹${n}`, formatDateDisplay: s => s,
  getBackendJwt: () => null, inputCls: "", parseCsvSummaryFooter: () => null,
  parseStatementViaBackend: async () => ({ rows: [] }),
  pdfDateToYMD: s => s, redactPII: s => s, selectCls: "",
};
const props = {
  open: true, categories: ["Groceries"], accounts: ["Checking"],
  categoryKeywords: {}, nameRules: [], rawNarrationMode: false, bankFingerprints: {},
  onClose() {}, onImport() {}, onCreateAccount() {}, onSaveBankFingerprint() {},
};

test("extracted import dialog keeps account selection", () => {
  const Modal = createImportCsvModal(deps);
  const html = renderToString(React.createElement(Modal, props));
  assert.match(html, /Import statement/);
  assert.match(html, /Which account is this statement from/);
  assert.match(html, /Checking/);
});

test("extracted import dialog can open directly at file selection", () => {
  const Modal = createImportCsvModal(deps);
  const html = renderToString(React.createElement(Modal, { ...props, showAccountStep: false }));
  assert.match(html, /Import statement/);
  assert.match(html, /CSV|PDF/);
  assert.match(html, /Maximum file size: 10 MB/);
});

test("statement size guard accepts the boundary and rejects oversized files", () => {
  assert.equal(MAX_STATEMENT_FILE_BYTES, 10 * 1024 * 1024);
  assert.equal(statementFileSizeError({ name: "statement.csv", size: MAX_STATEMENT_FILE_BYTES }), null);
  for (const name of ["statement.csv", "statement.xlsx", "statement.xls", "statement.pdf"]) {
    assert.match(statementFileSizeError({ name, size: MAX_STATEMENT_FILE_BYTES + 1 }), /10 MB or smaller/);
  }
  assert.equal(statementFileSizeError(null), null);
});

test("oversized spreadsheet selection stops before opening a file reader", () => {
  let onFileChange;
  const captureModal = ({ children }) => {
    const visit = (node) => {
      if (!React.isValidElement(node)) return;
      if (node.type === "input" && node.props.type === "file") onFileChange = node.props.onChange;
      React.Children.forEach(node.props.children, visit);
    };
    React.Children.forEach(children, visit);
    return null;
  };
  const ImportModal = createImportCsvModal({ ...deps, Modal: captureModal });
  renderToString(React.createElement(ImportModal, { ...props, showAccountStep: false }));
  assert.equal(typeof onFileChange, "function");
  const input = {
    files: [{ name: "large.xlsx", size: MAX_STATEMENT_FILE_BYTES + 1 }],
    value: "large.xlsx",
  };
  onFileChange({ target: input });
  assert.equal(input.value, "");
});
