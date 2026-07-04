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
  VULTR_API_KEY: z.string().min(1, "VULTR_API_KEY cannot be empty").optional(),
  VULTR_MODEL: z.string().min(1, "VULTR_MODEL cannot be empty").default("kimi-k2-instruct"),
});

const vultrEnvSchema = serverEnvSchema.pick({
  VULTR_API_KEY: true,
  VULTR_MODEL: true,
});

const buildFallbackClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://build-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-placeholder-anon-key",
};

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

function parseClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    if (isBuildPhase()) {
      return clientEnvSchema.parse(buildFallbackClientEnv);
    }

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

/** Lazily validates Vultr-only server variables for sponsor AI integrations. */
export function getVultrEnv() {
  const parsed = vultrEnvSchema.safeParse({
    VULTR_API_KEY: process.env.VULTR_API_KEY,
    VULTR_MODEL: process.env.VULTR_MODEL,
  });

  if (!parsed.success) {
    throw new Error(`Invalid Vultr environment variables:\n${formatZodError(parsed.error)}`);
  }

  return parsed.data;
}
