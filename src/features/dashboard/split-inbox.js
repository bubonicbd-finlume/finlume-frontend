import { addDays } from "./calculations.js";

export async function readSplitInbox(client, today) {
  const groupsResult = await client.rpc("krnshare_list_groups");
  if (groupsResult.error) throw groupsResult.error;
  if (!Array.isArray(groupsResult.data)) throw new Error("Split groups could not be confirmed.");
  const groups = groupsResult.data;
  if (groups.length > 50) throw new Error("Split has more groups than this inbox can safely check. Open Split to review them.");
  const horizon = addDays(today, 30);
  const results = await Promise.all(groups.map(async group => {
    if (!group?.id) throw new Error("A Split group has no readable ID.");
    const response = await client.from("ks_recurring_expenses").select("id,description,amount,next_due,active").eq("group_id", group.id);
    if (response.error) throw response.error;
    if (!Array.isArray(response.data)) throw new Error("Split reminders could not be confirmed.");
    return response.data.filter(item => item && item.active !== false && item.next_due <= horizon)
      .map(item => ({ key: `split:${group.id}:${item.id}`, groupId: group.id, title: item.description || "Split recurring expense", reason: `Split reminder in ${group.name || "a group"}; logging it is a separate action.`, date: item.next_due, amount: Number(item.amount) || null, kind: item.next_due < today ? "overdue" : "scheduled", tab: "split" }));
  }));
  return results.flat().sort((a, b) => a.date.localeCompare(b.date));
}
