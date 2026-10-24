export async function confirmWipeWrites(operations) {
  const results = await Promise.allSettled(operations.map(operation => operation()));
  if (results.some(result => result.status === "rejected" || result.value !== true)) {
    throw new Error("Some data could not be erased. The erase may be partial; check your connection and review your data before retrying.");
  }
}
