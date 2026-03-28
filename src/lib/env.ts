import { z } from "zod";

export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
export const DEFAULT_GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
}).refine(
  (value) =>
    Boolean(
      value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        value.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  {
    message:
      "Provide NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  },
);

const serviceRoleEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const geminiEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_LIVE_MODEL: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).optional(),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}

export function getSupabasePublicKey() {
  const env = getPublicEnv();

  return (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function getSupabaseServiceRoleKey() {
  return serviceRoleEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }).SUPABASE_SERVICE_ROLE_KEY;
}

export function getGeminiApiKey() {
  return geminiEnvSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_LIVE_MODEL: process.env.GEMINI_LIVE_MODEL,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  }).GEMINI_API_KEY;
}

export function getGeminiModel() {
  const env = geminiEnvSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_LIVE_MODEL: process.env.GEMINI_LIVE_MODEL,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  });

  const requestedModel = env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;

  return requestedModel;
}

export function getGeminiLiveModel() {
  const env = geminiEnvSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_LIVE_MODEL: process.env.GEMINI_LIVE_MODEL,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  });

  return env.GEMINI_LIVE_MODEL ?? DEFAULT_GEMINI_LIVE_MODEL;
}
