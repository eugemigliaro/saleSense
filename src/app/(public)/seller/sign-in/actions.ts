"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signInSellerAction(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const nextPathValue = formData.get("next");

  const email =
    typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const nextPath =
    typeof nextPathValue === "string" && nextPathValue.startsWith("/")
      ? nextPathValue
      : "/seller";

  if (!email) {
    redirect("/seller/sign-in?error=Email%20is%20required.");
  }

  if (!password) {
    redirect(
      `/seller/sign-in?error=${encodeURIComponent("Password is required.")}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      `/seller/sign-in?error=${encodeURIComponent("Invalid email or password.")}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  redirect(nextPath);
}
