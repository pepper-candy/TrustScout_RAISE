import { z } from "zod";

/**
 * Browser-safe environment variables (NEXT_PUBLIC_*).
 * Validated eagerly so misconfiguration fails fast, on both client and server.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

/**
 * Server-only environment variables. Never import `getServerEnv` (or its
 * result) from a "use client" component — the service role key must not
 * reach the browser bundle.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

function parseClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(`Invalid client environment variables:\n${formatZodError(parsed.error)}`);
  }

  return parsed.data;
}

/** Public, browser-safe environment variables. Validated once at import time. */
export const clientEnv = parseClientEnv();

/**
 * Lazily validates and returns server-only environment variables.
 * Call this ONLY from server-side code (Route Handlers, /lib/supabase/server.ts).
 */
export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${formatZodError(parsed.error)}`);
  }

  return { ...clientEnv, ...parsed.data };
}
