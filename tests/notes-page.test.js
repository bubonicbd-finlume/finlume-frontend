import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import ReactDOM from "react-dom";
import { renderToString } from "react-dom/server";
import { createNotesPage } from "../src/features/notes/page.js";

const h = React.createElement;
const icon = () => null;
const deps = {
  Button: ({ children }) => h("button", null, children), Card: ({ children }) => h("div", null, children),
  Modal: () => null, NT_COLOR_KEYS: [], NT_LS_PREFS: "notes-prefs", NT_MAX_BODY: 10000,
  NT_SETUP_SQL: "", NtIcon: icon, inputCls: "", ntChecklistStats: () => ({ total: 0, done: 0 }),
  ntFileKind: () => "file", ntFmtSize: () => "1 KB", ntH: h, ntIsEmptyNote: () => false,
  ntLocalYMD: () => "2026-10-18", ntLsGet: () => null, ntLsSet: () => {},
  ntPlain: text => text, ntPreviewHtml: text => text, ntRelEdited: () => "Today",
  ntRelUpdated: () => "Today", ntRemState: () => ({ kind: "none" }), ntSanitize: text => text,
  ntTagColor: () => ({ background: "#fff" }), uid: () => "new-note",
};

function renderNotes(notes) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousPortal = ReactDOM.createPortal;
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.document = { body: {} };
  ReactDOM.createPortal = node => node;
  try {
    const NotesPage = createNotesPage(deps);
    return renderToString(h(NotesPage, {
      store: { notes, status: "ready", loadError: null, save: { state: "saved" } },
      query: "", onQuery: () => {}, newToken: 0,
      settings: {}, onSaveSettings: () => {},
    }));
  } finally {
    ReactDOM.createPortal = previousPortal;
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
}

test("Notes page renders an empty notebook", () => {
  assert.match(renderNotes([]), /New note/);
});

test("Notes page renders a saved note", () => {
  const html = renderNotes([{
    id: "note-1", title: "Emergency fund", body: "Save monthly", plain: "Save monthly",
    tags: [], attachments: [], reminder: null, pinned: false, archived: false,
    editedAt: "2026-10-18T00:00:00Z", updatedAt: "2026-10-18T00:00:00Z",
    createdAt: "2026-10-18T00:00:00Z",
  }]);
  assert.match(html, /Emergency fund/);
});
