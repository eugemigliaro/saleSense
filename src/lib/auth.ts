import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SellerContext {
  email: string | null;
  storeId: string;
  userId: string;
}

function getStoreIdFromUser(user: User) {
  const storeId =
    (typeof user.app_metadata.store_id === "string"
      ? user.app_metadata.store_id
      : null) ??
    (typeof user.user_metadata.store_id === "string"
      ? user.user_metadata.store_id
      : null);

  return storeId;
}

export async function getSellerContext(): Promise<SellerContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const storeId = getStoreIdFromUser(user);

  if (!storeId) {
    return null;
  }

  return {
    email: user.email ?? null,
    storeId,
    userId: user.id,
  };
}

export async function requireSellerContext() {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    redirect("/seller/sign-in?error=Sign%20in%20with%20a%20store-scoped%20manager%20account.");
  }

  return sellerContext;
}

export function assertStoreScope(
  requestedStoreId: string,
  sellerContext: SellerContext,
) {
  return requestedStoreId === sellerContext.storeId;
}
