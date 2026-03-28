"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function buildOrigin(host: string | null, origin: string | null) {
  if (origin) {
    return origin;
  }

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = host.includes("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";

  return `${protocol}://${host}`;
}

export async function signInSellerAction(formData: FormData) {
  const emailValue = formData.get("email");
  const nextPathValue = formData.get("next");

  const email =
    typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const nextPath =
    typeof nextPathValue === "string" && nextPathValue.startsWith("/")
      ? nextPathValue
      : "/seller";

  if (!email) {
    redirect("/seller/sign-in?error=Email%20is%20required.");
  }

  const headerStore = await headers();
  const origin = buildOrigin(
    headerStore.get("host"),
    headerStore.get("origin"),
  );
  const redirectUrl = new URL("/auth/callback", origin);

  redirectUrl.searchParams.set("next", nextPath);

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl.toString(),
    },
  });

  if (error) {
    redirect(
      `/seller/sign-in?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  redirect(
    `/seller/sign-in?message=${encodeURIComponent("Check your email for the sign-in link.")}&next=${encodeURIComponent(nextPath)}`,
  );
}
