import { createClient } from "@supabase/supabase-js";

export function createFinLumeClient({ supabaseUrl, supabaseKey }) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
