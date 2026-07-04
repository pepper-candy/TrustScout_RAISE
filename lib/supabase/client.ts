import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Browser Supabase client, scoped to the anon key. Safe to call from
 * "use client" components. Create a fresh instance per call (cheap) rather
 * than sharing a module-level singleton, per @supabase/ssr conventions.
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
