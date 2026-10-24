import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createDocumentsPage } from "../src/features/documents/page.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, Button: box, Card: box,
  DOCUMENT_PREVIEW_MAX_BYTES: 5 * 1024 * 1024, Download: icon,
  EmptyState: ({ title }) => React.createElement("div", null, title),
  FileText: icon, INLINE_PREVIEW_MIMES: new Set(), IconButton: icon,
  Info: icon, Loader2: icon, Lock: icon, Modal: () => null,
  ShieldAlert: icon, Trash2: icon, Upload: icon,
  formatDateDisplay: () => "18 Oct 2026", nowISO: () => "2026-10-18T00:00:00Z",
  readFileAsDataUrl: async () => "", sanitizeFilename: name => name,
  uid: () => "doc-1", validateUpload: async () => ({ ok: true }),
  vaultDecryptString: async () => "", vaultEncryptString: async () => "",
};

function renderDocuments(documents, vaultEnabled = false) {
  const DocumentsPage = createDocumentsPage(deps);
  return renderToString(React.createElement(DocumentsPage, {
    documents, onUpload: () => {}, onDeleteDoc: () => {}, onDeleteDocs: () => {},
    vaultEnabled, vaultKey: null, onRequestUnlock: () => {},
  }));
}

test("Documents page renders an empty vault", () => {
  const html = renderDocuments([]);
  assert.match(html, /Upload documents/);
  assert.match(html, /No documents yet/);
});

test("Documents page shows a stored file and locked vault status", () => {
  const html = renderDocuments([{
    id: "doc-1", filename: "Receipt.pdf", mimeType: "application/pdf",
    size: 2048, createdAt: "2026-10-18T00:00:00Z", status: "stored", dataUrl: null,
  }], true);
  assert.match(html, /Receipt\.pdf/);
  assert.match(html, /Vault is locked/);
  assert.match(html, /aria-label="Select Receipt\.pdf"/);
  assert.match(html, /aria-label="Preview Receipt\.pdf"/);
  assert.doesNotMatch(html, /<button[^>]*>\s*<input type="checkbox"/);
});
