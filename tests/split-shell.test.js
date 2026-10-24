import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSplitShell, splitToastDuration } from "../src/features/split/shell.js";

const icon = () => null;
const button = ({ children }) => React.createElement("button", null, children);
const deps = new Proxy({
  Button: button,
  GlassSwitch: icon,
  SectionToggle: icon,
  KRNSHARE_NAV_TABS: [{ id: "overview", label: "Overview", icon }, { id: "groups", label: "Groups", icon }],
  KrnLegalLinks: icon,
  Modal: ({ open, title, children, footer }) => open
    ? React.createElement("section", null, React.createElement("h2", null, title), children, footer)
    : null,
  Field: ({ label, children }) => React.createElement("label", null, label, children),
  fallbackNameFromEmail: () => "Karan",
  inputCls: "",
  ksWhen: () => "just now",
  useGlassLens: () => ({ boxRef: { current: null }, lens: null }),
}, { get(target, key) { return key in target ? target[key] : icon; } });

test("Split gives longer messages time to be read", () => {
  assert.equal(splitToastDuration("Saved"), 2800);
  assert.equal(splitToastDuration("A past expense could not be moved. Review the group history before retrying this guest link and check the settlement records."), 6000);
});

test("Split sidebar and top bar retain group navigation and account actions", () => {
  const { KrnShareSidebar, KrnShareTopBar } = createSplitShell(deps);
  const sidebar = renderToString(React.createElement(KrnShareSidebar, {
    active: "overview", onNavigate() {}, userEmail: "member@example.test",
    displayName: "Member", onSignOut() {}, onOpenFeedback() {}, onEditName() {},
  }));
  assert.match(sidebar, /Finlume Split/);
  assert.match(sidebar, /Groups/);
  assert.match(sidebar, /Feedback/);
  assert.match(sidebar, /Sign out/);

  const topbar = renderToString(React.createElement(KrnShareTopBar, {
    title: "Overview", greetingName: "Member", section: "share", onSectionChange() {},
    dark: false, onToggleTheme() {}, glassOn: false, onToggleGlass() {},
    onNewGroup() {}, notifications: [], notifOpen: false, onToggleNotif() {},
    onCloseNotif() {}, onMarkAllRead() {}, onClearNotif() {}, onEditName() {},
  }));
  assert.match(topbar, /Hi, <!-- -->Member/);
  assert.match(topbar, /New group/);
  assert.match(topbar, /Notifications/);
});

test("Split name editor retains the shared profile setting", () => {
  const { KsEditNameModal } = createSplitShell(deps);
  const html = renderToString(React.createElement(KsEditNameModal, {
    open: true, onClose() {}, userEmail: "member@example.test",
    displayName: "Member", onSave() {},
  }));
  assert.match(html, /Your name/);
  assert.match(html, /Finlume Finance and Finlume Split/);
  assert.match(html, /value="Member"/);
});
