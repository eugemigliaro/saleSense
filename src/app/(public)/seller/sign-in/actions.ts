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
    const message =
      error.status === 400
        ? "Invalid email or password."
        : "Seller sign-in is unavailable right now.";

    redirect(
      `/seller/sign-in?error=${encodeURIComponent(message)}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  redirect(nextPath);
}
