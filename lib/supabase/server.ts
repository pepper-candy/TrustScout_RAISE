import { createClient } from "@supabase/supabase-js";

import { getSupabaseServerConfig } from "@/lib/env";
import type { Database } from "@/types/truthscout";

export function createSupabaseServerClient() {
  const config = getSupabaseServerConfig();

  if (!config) {
    return null;
  }

  return createClient<Database>(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
