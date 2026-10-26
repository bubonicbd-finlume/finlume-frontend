function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function readEnvironment(viteEnvironment) {
  const supabaseUrl = clean(viteEnvironment.VITE_SUPABASE_URL);
  const supabaseKey = clean(
    viteEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY || viteEnvironment.VITE_SUPABASE_ANON_KEY,
  );

  if (!supabaseUrl || !supabaseKey) {
    const error = new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
    error.code = "MISSING_SUPABASE_CONFIG";
    throw error;
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error();
  } catch {
    const error = new Error("VITE_SUPABASE_URL is not a valid Supabase project URL");
    error.code = "INVALID_SUPABASE_URL";
    throw error;
  }

  return Object.freeze({
    supabaseUrl,
    supabaseKey,
    auditLedgerEnabled: clean(viteEnvironment.VITE_AUDIT_LEDGER_ENABLED).toLowerCase() === "true",
  });
}

export function addSupabasePreconnect(supabaseUrl) {
  const origin = new URL(supabaseUrl).origin;
  if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}
