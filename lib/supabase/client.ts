import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/env";
import type { Database } from "@/types/truthscout";

export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  return createBrowserClient<Database>(config.url, config.anonKey);
}
