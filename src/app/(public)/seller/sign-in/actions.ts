"use server";

import { redirect } from "next/navigation";

import {
  registerSeller,
  sellerRegistrationSchema,
} from "@/lib/sellerRegistration";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getNextPath(nextPathValue: FormDataEntryValue | null) {
  return typeof nextPathValue === "string" && nextPathValue.startsWith("/")
    ? nextPathValue
    : "/seller";
}

export async function signInSellerAction(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const nextPath = getNextPath(formData.get("next"));

  const email =
    typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

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

export async function registerSellerAction(formData: FormData) {
  const nextPath = getNextPath(formData.get("next"));

  const parsedInput = sellerRegistrationSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    email: formData.get("email"),
    password: formData.get("password"),
    storeName: formData.get("storeName"),
  });

  if (!parsedInput.success) {
    const message =
      parsedInput.error.issues[0]?.message ?? "Registration is invalid.";

    redirect(
      `/seller/register?error=${encodeURIComponent(message)}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  try {
    await registerSeller(parsedInput.data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Seller registration is unavailable right now.";

    redirect(
      `/seller/register?error=${encodeURIComponent(message)}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsedInput.data.email,
    password: parsedInput.data.password,
  });

  if (error) {
    redirect(
      `/seller/sign-in?message=${encodeURIComponent("Account created. Sign in to continue.")}&next=${encodeURIComponent(nextPath)}`,
    );
  }

  redirect(nextPath);
}
