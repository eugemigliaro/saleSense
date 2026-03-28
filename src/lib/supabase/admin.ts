import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  getPublicEnv,
  getSupabaseServiceRoleKey,
} from "@/lib/env";
import type { Database } from "@/types/database";

export function createAdminSupabaseClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();

  return createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
