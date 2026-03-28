import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv, getSupabasePublicKey } from "@/lib/env";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();

  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    getSupabasePublicKey(),
  );
}
