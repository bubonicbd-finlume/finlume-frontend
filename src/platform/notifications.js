export async function readNotifications(client, userId) {
  const { data, error } = await client.from("notifications").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  if (data == null) return [];
  if (!Array.isArray(data)) throw new Error("Notifications could not be read.");
  return data;
}

export async function markNotificationRead(client, id) {
  const { error } = await client.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(client, userId) {
  const { error } = await client.from("notifications").update({ read: true })
    .eq("user_id", userId).eq("read", false);
  if (error) throw error;
}
