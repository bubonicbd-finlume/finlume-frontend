export function createSplitServices({ supabaseClient }) {
  const KS_SETUP_HINT = "Finlume Split's RPCs aren't installed on this Supabase project yet \u2014 run krnshare-phase3-rpcs.sql, krnshare-phase4-rpcs.sql and krnshare-phase5-rpcs.sql in the SQL editor, then reload.";
  function ksIsMissingSchema(error) {
    const code = error?.code || "", msg = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    return code === "PGRST202" || code === "42883" || msg.includes("could not find the function") || msg.includes("schema cache");
  }
  const KS_CATEGORY_CHECK_SQL = "ALTER TABLE krnshare_expenses DROP CONSTRAINT krnshare_expenses_category_check;";
  function ksIsCategoryCheckError(error) {
    return `${error?.message || ""} ${error?.details || ""}`.toLowerCase().includes("krnshare_expenses_category_check");
  }
  function ksErrorText(error) {
    return ksIsMissingSchema(error) ? KS_SETUP_HINT : ksIsCategoryCheckError(error) ? `This Supabase project's database still restricts expense categories to an old fixed list. Run this once in the Supabase SQL editor, then try again \u2014 it removes the restriction entirely so this can't happen again as categories change:
` + KS_CATEGORY_CHECK_SQL : error?.message || "Something went wrong. Please try again.";
  }
  async function ksListGroups() {
    const { data, error } = await supabaseClient.rpc("krnshare_list_groups");
    if (error) throw error;
    return data || [];
  }
  async function ksCreateGroup(name) {
    const { data, error } = await supabaseClient.rpc("krnshare_create_group", { p_name: name });
    if (error) throw error;
    return data;
  }
  async function ksListMembers(groupId) {
    const { data, error } = await supabaseClient.rpc("krnshare_list_members", { p_group: groupId });
    if (error) throw error;
    return data || [];
  }
  async function ksAddMemberByEmail(groupId, email) {
    const { data, error } = await supabaseClient.rpc("krnshare_add_member_by_email", { p_group: groupId, p_email: email });
    if (error) throw error;
    return data === true;
  }
  async function ksRemoveMember(groupId, userId) {
    const { data, error } = await supabaseClient.rpc("krnshare_remove_member", { p_group: groupId, p_user: userId });
    if (error) throw error;
    return data === true;
  }
  async function ksRenameGroup(groupId, name) {
    const { error } = await supabaseClient.rpc("krnshare_rename_group", { p_group: groupId, p_name: name });
    if (error) throw error;
  }
  async function ksLeaveGroup(groupId) {
    const { error } = await supabaseClient.rpc("krnshare_leave_group", { p_group: groupId });
    if (error) throw error;
  }
  async function ksDeleteGroup(groupId) {
    const { error } = await supabaseClient.from("krnshare_groups").delete().eq("id", groupId);
    if (error) throw error;
  }
  async function ksSetGroupIcon(groupId, icon) {
    const { error } = await supabaseClient.from("krnshare_groups").update({ icon }).eq("id", groupId);
    if (error) throw error;
  }
  async function ksListExpenses(groupId) {
    const { data, error } = await supabaseClient.rpc("krnshare_list_expenses", { p_group: groupId });
    if (error) throw error;
    return data || [];
  }
  async function ksAddExpense(p) {
    const basePayload = { p_group: p.groupId, p_payer: p.payerId, p_category: p.category, p_amount: p.amount, p_description: p.description || null, p_expense_date: p.date, p_split_method: p.method, p_splits_json: p.splits };
    try {
      if (p.merchant || p.source) {
        const { data: data2, error: error2 } = await supabaseClient.rpc("krnshare_add_expense", { ...basePayload, p_merchant: p.merchant || null, p_source: p.source || "MANUAL" });
        if (!error2) return data2;
        if (!ksIsMissingSchema(error2)) throw error2;
      }
      const { data, error } = await supabaseClient.rpc("krnshare_add_expense", basePayload);
      if (error) throw error;
      return data;
    } catch (error) {
      throw ksLogFailedExpense(p.groupId, p.category, p.amount, error), error;
    }
  }
  async function ksEditExpense(p) {
    try {
      const { data, error } = await supabaseClient.rpc("krnshare_edit_expense", { p_expense: p.expenseId, p_category: p.category, p_amount: p.amount, p_description: p.description || null, p_expense_date: p.date, p_split_method: p.method, p_splits_json: p.splits, p_payer: p.payerId });
      if (error) throw error;
      return data === true;
    } catch (error) {
      throw ksLogFailedExpense(p.groupId, p.category, p.amount, error), error;
    }
  }
  function ksLogFailedExpense(groupId, category, amount, error) {
    supabaseClient.rpc("krnshare_log_failed_expense", { p_group: groupId || null, p_category: category || null, p_amount: amount || null, p_error: error && error.message || "Unknown error" }).then(() => {
    }, () => {
    });
  }
  async function ksDeleteExpense(expenseId) {
    const { data, error } = await supabaseClient.rpc("krnshare_delete_expense", { p_expense: expenseId });
    if (error) throw error;
    return data === true;
  }
  async function ksClaimExpenseLock(expenseId) {
    const { data, error } = await supabaseClient.rpc("krnshare_claim_expense_lock", { p_expense: expenseId });
    if (error) throw error;
    return data || { ok: false };
  }
  async function ksReleaseExpenseLock(expenseId) {
    try {
      await supabaseClient.rpc("krnshare_release_expense_lock", { p_expense: expenseId });
    } catch {
    }
  }
  async function ksGetScannerAccess(userId) {
    try {
      const { data, error } = await supabaseClient.rpc("krnshare_receipt_scanner_access");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { enabled: !!(row && row.allowed), reason: row?.reason || "" };
    } catch {
      return { enabled: false, reason: "unavailable" };
    }
  }
  async function ksComputeBalances(groupId) {
    const { data, error } = await supabaseClient.rpc("krnshare_compute_balances", { p_group: groupId });
    if (error) throw error;
    const rows = data || [], simplified = rows.length ? rows[0].simplified_list_json || [] : [];
    return { people: rows.map((r) => ({ user_id: r.user_id, display_name: r.display_name, paid: Number(r.paid_amount) || 0, owed: Number(r.owed_amount) || 0, net: Number(r.net_amount) || 0 })), simplified: (simplified || []).map((t) => ({ from_id: t.from_id, from_name: t.from_name, to_id: t.to_id, to_name: t.to_name, amount: Number(t.amount) || 0 })) };
  }
  function ksComputeDirectDebts(expenses, settlements, people) {
    const raw = /* @__PURE__ */ new Map(), bump = (debtor, creditor, amount) => {
      if (!amount || debtor === creditor) return;
      const key = `${debtor}|${creditor}`;
      raw.set(key, (raw.get(key) || 0) + amount);
    };
    for (const e of expenses || []) {
      const payer = e.payer_id;
      for (const s of e.splits_json || []) s.user_id !== payer && bump(s.user_id, payer, Number(s.share_amount) || 0);
    }
    for (const s of settlements || []) bump(s.from_id, s.to_id, -(Number(s.amount) || 0));
    const nameOf = (id) => (people || []).find((p) => p.user_id === id)?.display_name || "Member", seenPairs = /* @__PURE__ */ new Set(), out = [];
    for (const key of raw.keys()) {
      const [a, b] = key.split("|"), pairKey = [a, b].sort().join("|");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      const aOwesB = raw.get(`${a}|${b}`) || 0, bOwesA = raw.get(`${b}|${a}`) || 0, net = aOwesB - bOwesA;
      if (Math.abs(net) < 5e-3) continue;
      const [from_id, to_id, amount] = net > 0 ? [a, b, net] : [b, a, -net];
      out.push({ from_id, from_name: nameOf(from_id), to_id, to_name: nameOf(to_id), amount });
    }
    return out.sort((x, y) => y.amount - x.amount);
  }
  async function ksRecordSettlement(p) {
    const { data, error } = await supabaseClient.rpc("krnshare_record_settlement", { p_group: p.groupId, p_from: p.fromId, p_to: p.toId, p_amount: p.amount, p_note: p.note || null });
    if (error) throw error;
    return data === true;
  }
  async function ksListSettlements(groupId, limit = 50) {
    const { data, error } = await supabaseClient.rpc("krnshare_list_settlements", { p_group: groupId, p_limit: limit });
    if (error) throw error;
    return data || [];
  }
  async function ksDeleteSettlement(groupId, settlementId) {
    const { data, error } = await supabaseClient.rpc("krnshare_delete_settlement", { p_group: groupId, p_settlement: settlementId });
    if (error) throw error;
    return data === true;
  }
  async function ksGetBudget(groupId) {
    const { data, error } = await supabaseClient.from("ks_group_settings").select("budget").eq("group_id", groupId).maybeSingle();
    if (error) throw error;
    return data && data.budget !== null ? Number(data.budget) : null;
  }
  async function ksSaveBudget(groupId, amount) {
    const budget = amount == null || amount === "" ? null : Number(amount);
    const { error } = await supabaseClient.from("ks_group_settings").upsert([{ group_id: groupId, budget, updated_at: new Date().toISOString() }], { onConflict: "group_id" });
    if (error) throw error;
  }
  async function ksGetArchivedIds(userId) {
    const { data, error } = await supabaseClient.from("ks_user_group_prefs").select("group_id").eq("user_id", userId).eq("archived", true);
    if (error) throw error;
    return new Set((data || []).map(row => row.group_id));
  }
  async function ksSetGroupArchived(userId, groupId, archived) {
    const { error } = await supabaseClient.from("ks_user_group_prefs").upsert([{ user_id: userId, group_id: groupId, archived, updated_at: new Date().toISOString() }], { onConflict: "user_id,group_id" });
    if (error) throw error;
  }
  function ksGuestRowToClient(r) {
  return { id: `guest:${r.id}`, name: r.name };
}
function ksGuestDbId(clientId) {
  return typeof clientId == "string" && clientId.startsWith("guest:") ? clientId.slice(6) : clientId;
}
async function ksListGuests(groupId) {
  const { data, error } = await supabaseClient.from("ks_guests").select("*").eq("group_id", groupId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(ksGuestRowToClient);
}
async function ksAddGuestRow(groupId, name, createdBy) {
  const { data, error } = await supabaseClient.from("ks_guests").insert([{ group_id: groupId, name, created_by: createdBy }]).select().single();
  if (error) throw error;
  return ksGuestRowToClient(data);
}
async function ksRemoveGuestRow(groupId, guestId) {
  const { error } = await supabaseClient.from("ks_guests").delete().eq("id", ksGuestDbId(guestId)).eq("group_id", groupId);
  if (error) throw error;
}
function ksGuestExpenseRowToClient(r) {
  return { id: r.id, payerId: r.payer_id, category: r.category, amount: r.amount, description: r.description, date: r.expense_date, method: r.split_method, splits: r.splits || [] };
}
async function ksListGuestExpenses(groupId) {
  const { data, error } = await supabaseClient.from("ks_guest_expenses").select("*").eq("group_id", groupId).order("expense_date", { ascending: false });
  if (error) throw error;
  return (data || []).map(ksGuestExpenseRowToClient);
}
async function ksAddGuestExpenseRow(groupId, e, createdBy) {
  const { data, error } = await supabaseClient.from("ks_guest_expenses").insert([{ group_id: groupId, payer_id: e.payerId, category: e.category, amount: e.amount, description: e.description || null, expense_date: e.date, split_method: e.method, splits: e.splits || [], created_by: createdBy }]).select().single();
  if (error) throw error;
  return ksGuestExpenseRowToClient(data);
}
async function ksEditGuestExpenseRow(groupId, id, e) {
  const { error } = await supabaseClient.from("ks_guest_expenses").update({ payer_id: e.payerId, category: e.category, amount: e.amount, description: e.description || null, expense_date: e.date, split_method: e.method, splits: e.splits || [] }).eq("id", id).eq("group_id", groupId);
  if (error) throw error;
}
async function ksDeleteGuestExpenseRow(groupId, id) {
  const { error } = await supabaseClient.from("ks_guest_expenses").delete().eq("id", id).eq("group_id", groupId);
  if (error) throw error;
}
function ksIsGuestId(id) {
  return typeof id == "string" && id.startsWith("guest:");
}
function ksGuestSettlementRowToClient(r) {
  return { id: r.id, fromId: r.from_id, toId: r.to_id, amount: r.amount, note: r.note || "", settledAt: r.settled_at, recordedBy: r.recorded_by, recordedByName: r.recorded_by_name, deleted: r.deleted, deletedBy: r.deleted_by, deletedByName: r.deleted_by_name, deletedAt: r.deleted_at };
}
async function ksListGuestSettlements(groupId) {
  const { data, error } = await supabaseClient.from("ks_guest_settlements").select("*").eq("group_id", groupId).order("settled_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(ksGuestSettlementRowToClient);
}
async function ksRecordGuestSettlement(groupId, { fromId, toId, amount, note, by, byName }) {
  const { data, error } = await supabaseClient.from("ks_guest_settlements").insert([{ group_id: groupId, from_id: fromId, to_id: toId, amount: Number(amount) || 0, note: note || "", recorded_by: by, recorded_by_name: byName }]).select().single();
  if (error) throw error;
  return ksGuestSettlementRowToClient(data);
}
async function ksDeleteGuestSettlement(groupId, settlementId, by, byName) {
  const { error } = await supabaseClient.from("ks_guest_settlements").update({ deleted: true, deleted_by: by, deleted_by_name: byName, deleted_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", settlementId).eq("group_id", groupId);
  if (error) throw error;
}
function ksComputeGuestSettlement(participants, guestExpenses, guestSettlements = []) {
  const net = new Map(participants.map((p) => [p.id, 0]));
  for (const e of guestExpenses) {
    const amt = Number(e.amount) || 0;
    net.has(e.payerId) && net.set(e.payerId, net.get(e.payerId) + amt);
    for (const s of e.splits || []) net.has(s.id) && net.set(s.id, net.get(s.id) - (Number(s.share) || 0));
  }
  for (const s of guestSettlements) {
    if (s.deleted) continue;
    const amt = Number(s.amount) || 0;
    net.has(s.fromId) && net.set(s.fromId, net.get(s.fromId) + amt), net.has(s.toId) && net.set(s.toId, net.get(s.toId) - amt);
  }
  const creditors = [], debtors = [];
  for (const [id, bal] of net.entries()) bal > 0.5 ? creditors.push({ id, amt: bal }) : bal < -0.5 && debtors.push({ id, amt: -bal });
  creditors.sort((a, b) => b.amt - a.amt), debtors.sort((a, b) => b.amt - a.amt);
  const transfers = [];
  let i = 0, j = 0;
  for (; i < debtors.length && j < creditors.length; ) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay }), debtors[i].amt -= pay, creditors[j].amt -= pay, debtors[i].amt < 0.5 && i++, creditors[j].amt < 0.5 && j++;
  }
  return { net, transfers };
}
function ksGuestExpenseToDisplay(e, labelFor, userId) {
  return { id: e.id, description: e.description, category: e.category, amount: e.amount, expense_date: e.date, split_method: e.method, payer_id: e.payerId, payer_name: labelFor(e.payerId), splits_json: (e.splits || []).map((s) => ({ user_id: s.id, display_name: labelFor(s.id), share_amount: s.share, is_deleted: false, is_removed: false })), can_edit: true, editing_by: null, lock_is_stale: false, isLocalGuest: true };
}
async function ksMigrateGuestHistory(groupId, guestId, newUserId, actorUserId) {
  const remap = (id) => id === guestId ? newUserId : id;
  const [allExpenses, settlements] = await Promise.all([ksListGuestExpenses(groupId), ksListGuestSettlements(groupId)]);
  let migrated = 0;
  const failedToMigrate = [];
  let remaining = 0;
  for (const e of allExpenses) {
    if (!(e.payerId === guestId || (e.splits || []).some((s) => s.id === guestId))) continue;
    const rewritten = { ...e, payerId: remap(e.payerId), splits: (e.splits || []).map((s) => ({ ...s, id: remap(s.id) })) };
    if (ksIsGuestId(rewritten.payerId) || rewritten.splits.some((s) => ksIsGuestId(s.id))) {
      await ksEditGuestExpenseRow(groupId, e.id, rewritten).catch(() => {
      }), remaining++;
      continue;
    }
    try {
      await ksAddExpense({ groupId, payerId: rewritten.payerId, category: rewritten.category, amount: rewritten.amount, description: rewritten.description, date: rewritten.date, method: rewritten.method, splits: rewritten.splits.map((s) => ({ user_id: s.id, share_amount: s.share })) }), await ksDeleteGuestExpenseRow(groupId, e.id), migrated++;
    } catch {
      await ksEditGuestExpenseRow(groupId, e.id, rewritten).catch(() => {
      }), remaining++, failedToMigrate.push(e.id);
    }
  }
  let settlementFailed = 0;
  for (const s of settlements) {
    if (s.fromId !== guestId && s.toId !== guestId) continue;
    try {
      const { error } = await supabaseClient.from("ks_guest_settlements").update({ from_id: remap(s.fromId), to_id: remap(s.toId) }).eq("id", s.id).eq("group_id", groupId);
      if (error) settlementFailed++;
    } catch {
      settlementFailed++;
    }
  }
  return { migrated, remaining, failed: failedToMigrate.length, settlementFailed };
}
async function ksGetGuestClaims(groupId) {
  const { data, error } = await supabaseClient.from("ks_guest_claims").select("*").eq("group_id", groupId);
  if (error) throw error;
  const map = {};
  for (const r of data || []) map[r.guest_id] = { email: r.email, linkedAt: r.linked_at };
  return map;
}
async function ksSaveGuestClaim(groupId, guestId, email) {
  const { error } = await supabaseClient.from("ks_guest_claims").upsert([{ group_id: groupId, guest_id: guestId, email, linked_at: new Date().toISOString() }], { onConflict: "group_id,guest_id" });
  if (error) throw error;
}

  return { ksListGuests, ksAddGuestRow, ksRemoveGuestRow, ksListGuestExpenses, ksAddGuestExpenseRow, ksEditGuestExpenseRow, ksDeleteGuestExpenseRow, ksIsGuestId, ksListGuestSettlements, ksRecordGuestSettlement, ksDeleteGuestSettlement, ksComputeGuestSettlement, ksGuestExpenseToDisplay, ksMigrateGuestHistory, ksGetGuestClaims, ksSaveGuestClaim, ksGetBudget, ksSaveBudget, ksGetArchivedIds, ksSetGroupArchived, ksIsMissingSchema, ksIsCategoryCheckError, ksErrorText, ksListGroups, ksCreateGroup, ksListMembers, ksAddMemberByEmail, ksRemoveMember, ksRenameGroup, ksLeaveGroup, ksDeleteGroup, ksSetGroupIcon, ksListExpenses, ksAddExpense, ksEditExpense, ksDeleteExpense, ksClaimExpenseLock, ksReleaseExpenseLock, ksGetScannerAccess, ksComputeBalances, ksComputeDirectDebts, ksRecordSettlement, ksListSettlements, ksDeleteSettlement };
}
