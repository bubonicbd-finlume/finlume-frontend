import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createSplitGroups, guestMigrationMessage } from "../src/features/split/groups.js";

const icon = () => null;
const box = ({ children }) => React.createElement("div", null, children);
const deps = new Proxy({
  Button: ({ children }) => React.createElement("button", null, children),
  Card: box,
  Modal: ({ open, children }) => open ? React.createElement("section", null, children) : null,
  ConfirmTypeModal: icon,
  EmptyState: ({ title }) => React.createElement("p", null, title),
  KsGroupOverviewCard: box,
  KsExpensesCard: box,
  KsRecurringCard: box,
  KsBalancesCard: box,
  KsActivityCard: box,
  ksGroupIcon: () => icon,
  ksErrorText: error => String(error),
  ksPageCount: () => 1,
  ksPageSlice: rows => rows,
  inputCls: "",
}, { get(target, key) { return key in target ? target[key] : icon; } });

test("Split groups page retains loading and group creation entry points", () => {
  const { KrnShareGroupsPage } = createSplitGroups(deps);
  const html = renderToString(React.createElement(KrnShareGroupsPage, {
    session: { user: { id: "isolated-user" } }, newGroupSignal: 0,
    openGroupRequest: null, onToast() {},
  }));
  assert.match(html, /Your groups/);
  assert.match(html, /New group/);
  assert.match(html, /Loading/);
});

test("Split group creation reports an icon failure without treating the group as absent", async () => {
  let iconWrites = 0;
  const custom = new Proxy(deps, {
    get(target, key) {
      if (key === "ksCreateGroup") return async () => "group-1";
      if (key === "ksSetGroupIcon") return async () => { iconWrites += 1; throw new Error("Icon unavailable"); };
      return target[key];
    },
  });
  const { ksCreateGroupWithIcon } = createSplitGroups(custom);
  assert.deepEqual(await ksCreateGroupWithIcon("Trip", "plane"), { id: "group-1", iconSaved: false });
  assert.deepEqual(await ksCreateGroupWithIcon("Trip", "friends"), { id: "group-1", iconSaved: true });
  assert.equal(iconWrites, 1);
  const failed = new Proxy(deps, {
    get(target, key) {
      if (key === "ksCreateGroup") return async () => null;
      return target[key];
    },
  });
  await assert.rejects(createSplitGroups(failed).ksCreateGroupWithIcon("Trip", "friends"), /not created/);
});

test("Split group detail retains member, guest, and lazy section entry points", () => {
  const { KrnShareGroupDetail } = createSplitGroups(deps);
  const html = renderToString(React.createElement(KrnShareGroupDetail, {
    group: { id: "isolated-group", name: "Goa trip", created_by: "isolated-user", icon: "friends" },
    session: { user: { id: "isolated-user" } }, isArchived: false,
    onArchiveToggle() {}, onBack() {}, onChanged() {}, onGone() {}, onToast() {},
  }));
  assert.match(html, /Goa trip/);
  assert.match(html, /Members/);
  assert.match(html, /Add a guest/);
  assert.match(html, /Loading members/);
  assert.match(html, /Activity/);
  assert.match(html, /Icon/);
});

test("guest migration notice reports incomplete expenses and settlements", () => {
  assert.match(guestMigrationMessage("Avery", "a@example.test", { migrated: 0, remaining: 1, failed: 1, settlementFailed: 2 }), /1 past expense\(s\) could not be moved and 2 past settlement\(s\) could not be moved/);
  assert.match(guestMigrationMessage("Avery", "a@example.test", { migrated: 1, remaining: 1, failed: 0, settlementFailed: 0 }), /1 still involve unlinked guests/);
  assert.match(guestMigrationMessage("Avery", "a@example.test", { migrated: 1, remaining: 0, failed: 0, settlementFailed: 0 }), /past history moved over/);
});
