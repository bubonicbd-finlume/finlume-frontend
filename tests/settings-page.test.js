import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSettingsPage } from "../src/features/settings/page.js";
import { createBackupRestoreCard } from "../src/features/settings/backup-restore.js";
import { createDocumentVaultManager } from "../src/features/settings/document-vault.js";
import { createAccountControls } from "../src/features/settings/account-controls.js";

const box = ({ children }) => React.createElement("div", null, children);
const icon = () => null;
const deps = {
  AlertTriangle: icon, backupTransactionFingerprint: () => "fingerprint",
  Button: box, Card: box, Check: icon, CheckCircle: icon, Download: icon,
  ConfirmTypeModal: () => null, CURRENCIES: { INR: { symbol: "₹" } },
  DeleteAccountModal: () => null,
  FINLUME_BACKUP_SCHEMA: "finlume", FINLUME_BACKUP_VERSION: 2,
  Field: ({ label, children }) => React.createElement("div", null, label, children),
  LG_MODES: ["auto", "full", "lite", "off"],
  ListManager: () => null, ListChecks: icon, Loader2: icon, Lock: icon, LockOpen: icon,
  EmptyState: box, IconButton: icon, ManageEntryModal: () => null,
  Modal: ({ open, title, children }) => open ? React.createElement("div", null, title, children) : null,
  NameRulesManager: () => null,
  Pencil: icon, Pill: box, Plus: icon, Repeat: icon,
  ShieldAlert: icon,
  Toggle: () => null, ToggleSwitch: () => null, Trash2: icon, Upload: icon,
  createVaultConfig: async () => ({}), fallbackNameFromEmail: () => "Karan",
  finlumeSha256: async () => "hash", regenerateRecoveryCode: async () => ({}),
  inputCls: "", selectCls: "", inspectBackupIntegrity: async () => ({ state: "valid" }),
  isCategoryEssential: () => false, useFinlumeSyncStatus: () => ({ status: "saved" }),
  sortCategoriesCanonical: categories => categories, todayYMD: () => "2026-10-18",
  nowISO: () => "2026-10-18T00:00:00Z", uid: () => "id-1",
  unlockVault: async () => null, unlockVaultWithRecoveryCode: async () => null,
  supabaseClient: { auth: {} },
};
const settings = {
  accounts: [], categories: ["Groceries"], categoryEssential: {},
  incomeSources: [], paymentMethods: [], tags: [], dismissedPatterns: [], currency: "INR",
  theme: "light", textSize: "normal", glassMode: "auto",
};

test("extracted Settings page renders profile and core preferences", () => {
  const Page = createSettingsPage(deps);
  const html = renderToString(React.createElement(Page, {
    settings, transactions: [], documents: [], userEmail: "karan@example.com",
    displayName: "Karan", onSaveSettings() {}, onWipe() {},
    onSaveDisplayName() {}, onDeleteAccount() {}, onVaultKeyChange() {},
    onReencryptDocuments() {}, onRestoreTransactions() {}, onRestoreDocuments() {},
  }));
  assert.match(html, /Your profile/);
  assert.match(html, /Karan/);
  assert.match(html, /Groceries/);
  assert.match(html, /Backup, restore &amp; sync/);
  assert.match(html, /Automatic categorization/);
  assert.match(html, /Names and keywords/);
  assert.match(html, /Open Data Health/);
  assert.match(html, /Keeps the smooth Lite appearance when on/);
  assert.match(html, /12,345.67/);
  assert.equal((html.match(/Automatic categorization/g) || []).length, 2);
});

test("extracted backup card offers a checked download and restore preview", () => {
  const Card = createBackupRestoreCard(deps);
  const html = renderToString(React.createElement(Card, {
    settings, transactions: [], documents: [], onSaveSettings() {},
    onDownload() {}, onRestoreTransactions() {}, onRestoreDocuments() {},
  }));
  assert.match(html, /Download checked backup/);
  assert.match(html, /Inspect restore file/);
});

test("extracted document vault panel renders the disabled state", () => {
  const Vault = createDocumentVaultManager(deps);
  const html = renderToString(React.createElement(Vault, {
    settings, documents: [], vaultKey: null, onSaveSettings() {},
    onVaultKeyChange() {}, onReencryptDocuments() {},
  }));
  assert.match(html, /vault/i);
  assert.match(html, /Turn on/);
  assert.match(html, /0<!-- --> encrypted/);
});

test("extracted document vault panel keeps the locked state visible", () => {
  const Vault = createDocumentVaultManager(deps);
  const html = renderToString(React.createElement(Vault, {
    settings: { ...settings, vaultConfig: { version: 2 } },
    documents: [{ id: "one", encrypted: true }], vaultKey: null,
    onSaveSettings() {}, onVaultKeyChange() {}, onReencryptDocuments() {},
  }));
  assert.match(html, /On — locked/);
  assert.match(html, /encrypted/);
});

test("extracted account controls retain deletion confirmation and password form", () => {
  const { DeleteAccountModal, PasswordChangeCard } = createAccountControls(deps);
  const deletion = renderToString(React.createElement(DeleteAccountModal, {
    open: true, userEmail: "karan@example.com", onClose() {},
    onConfirm() {}, onDownloadBackup() {},
  }));
  const password = renderToString(React.createElement(PasswordChangeCard, {
    userEmail: "karan@example.com",
  }));
  assert.match(deletion, /Delete your account/);
  assert.match(deletion, /karan@example.com/);
  assert.match(password, /password/i);
});
