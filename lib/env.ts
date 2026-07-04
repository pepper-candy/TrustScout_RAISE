import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmptyString,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  VULTR_API_KEY: optionalNonEmptyString,
  GRADIUM_API_KEY: optionalNonEmptyString,
});

const parsedEnv = envSchema.safeParse(process.env);

export const env = parsedEnv.success
  ? parsedEnv.data
  : {
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      VULTR_API_KEY: undefined,
      GRADIUM_API_KEY: undefined,
    };

export const envValidationErrors = parsedEnv.success
  ? []
  : parsedEnv.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);

export function getSupabasePublicConfig() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseServerConfig() {
  const publicConfig = getSupabasePublicConfig();

  if (!publicConfig) {
    return null;
  }

  return {
    url: publicConfig.url,
    key: env.SUPABASE_SERVICE_ROLE_KEY ?? publicConfig.anonKey,
  };
}
