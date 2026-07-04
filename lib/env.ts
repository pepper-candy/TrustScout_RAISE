import { z } from "zod";

const BUILD_PLACEHOLDER_CLIENT_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://build-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "build-placeholder-anon-key",
} as const;

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

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

const vultrEnvSchema = z.object({
  VULTR_API_KEY: z.string().min(1).optional(),
  VULTR_INFERENCE_API_KEY: z.string().min(1).optional(),
  VULTR_INFERENCE_MODEL: z.string().min(1).default("kimi-k2-instruct"),
  VULTR_INFERENCE_URL: z
    .url({ message: "VULTR_INFERENCE_URL must be a valid URL" })
    .default("https://api.vultrinference.com/v1/chat/completions"),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

function parseClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      (isBuildPhase() ? BUILD_PLACEHOLDER_CLIENT_ENV.NEXT_PUBLIC_SUPABASE_URL : undefined),
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      (isBuildPhase() ? BUILD_PLACEHOLDER_CLIENT_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined),
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

export function getVultrEnv() {
  const parsed = vultrEnvSchema.safeParse({
    VULTR_API_KEY: process.env.VULTR_API_KEY,
    VULTR_INFERENCE_API_KEY: process.env.VULTR_INFERENCE_API_KEY,
    VULTR_INFERENCE_MODEL: process.env.VULTR_INFERENCE_MODEL,
    VULTR_INFERENCE_URL: process.env.VULTR_INFERENCE_URL,
  });

  if (!parsed.success) {
    throw new Error(`Invalid Vultr environment variables:\n${formatZodError(parsed.error)}`);
  }

  const inferenceApiKey = parsed.data.VULTR_INFERENCE_API_KEY ?? parsed.data.VULTR_API_KEY;

  return {
    inferenceApiKey,
    inferenceModel: parsed.data.VULTR_INFERENCE_MODEL,
    inferenceUrl: parsed.data.VULTR_INFERENCE_URL,
  };
}
