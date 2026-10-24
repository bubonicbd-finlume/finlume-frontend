export async function updateUserDataFields(client, userId, fields, updatedAt, expectedUpdatedAt) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields) || !Object.keys(fields).length || Object.keys(fields).some(key => !["transactions", "documents", "settings"].includes(key))) {
    throw new Error("Unsupported account fields for cloud save.");
  }
  let query = client.from("ledgerly_data")
    .update({ ...fields, updated_at: updatedAt })
    .eq("user_id", userId);
  if (expectedUpdatedAt !== undefined) query = expectedUpdatedAt === null
    ? query.is("updated_at", null)
    : query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query.select(expectedUpdatedAt === undefined ? "user_id" : "user_id, updated_at");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1 || data[0]?.user_id !== userId) {
    throw new Error(expectedUpdatedAt === undefined ? "The save was not confirmed for this account. Refresh and try again." : "This account changed in another tab or device. Refresh before retrying; no stale save was applied.");
  }
  return data[0].updated_at;
}

export function updateUserDataField(client, userId, field, value, updatedAt, expectedUpdatedAt) {
  return updateUserDataFields(client, userId, { [field]: value }, updatedAt, expectedUpdatedAt);
}
