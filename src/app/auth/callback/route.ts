import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const authCode = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next");
  const redirectPath = nextPath?.startsWith("/") ? nextPath : "/seller";

  if (!authCode) {
    const errorUrl = new URL("/seller/sign-in", requestUrl.origin);
    errorUrl.searchParams.set("error", "Missing authentication code.");

    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(authCode);

  if (error) {
    const errorUrl = new URL("/seller/sign-in", requestUrl.origin);
    errorUrl.searchParams.set("error", error.message);

    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
