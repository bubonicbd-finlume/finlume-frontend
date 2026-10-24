export async function readInitialSession(auth) {
  const result = await auth.getSession();
  if (result?.error) throw result.error;
  return result?.data?.session ?? null;
}
