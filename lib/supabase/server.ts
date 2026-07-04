import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Server-only Supabase client authenticated with the service role key.
 * Only import this from Route Handlers or other server-side code — never
 * from a "use client" component, and never expose its client to the browser.
 */
export function createServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceRoleClient must only be called on the server");
  }

  const env = getServerEnv();

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
