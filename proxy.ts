import type { NextRequest } from "next/server";

import {
  redirectWithSupabaseCookies,
  refreshSupabaseSession,
} from "@/lib/supabase/proxy";

function isProtectedSellerPath(pathname: string) {
  return pathname === "/seller" || pathname.startsWith("/seller/");
}

function isSellerSignInPath(pathname: string) {
  return pathname === "/seller/sign-in";
}

function isAuthPath(pathname: string) {
  return pathname.startsWith("/auth");
}

export async function proxy(request: NextRequest) {
  const { response, user } = await refreshSupabaseSession(request);
  const { pathname } = request.nextUrl;

  if (isAuthPath(pathname)) {
    return response;
  }

  if (isProtectedSellerPath(pathname) && !isSellerSignInPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/seller/sign-in";

    if (pathname !== "/seller/sign-in") {
      redirectUrl.searchParams.set("next", pathname);
    }

    return redirectWithSupabaseCookies(redirectUrl, response);
  }

  if (isSellerSignInPath(pathname) && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/seller";
    redirectUrl.searchParams.delete("next");

    return redirectWithSupabaseCookies(redirectUrl, response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
