export async function readOwnProfile(client, userId) {
  const { data, error } = await client.from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDisplayName(client, userId, value) {
  const { data, error } = await client.from("profiles")
    .update({ display_name: value })
    .eq("user_id", userId)
    .select("user_id");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1 || data[0]?.user_id !== userId) {
    throw new Error("The name change was not confirmed for this account. Try again.");
  }
}
