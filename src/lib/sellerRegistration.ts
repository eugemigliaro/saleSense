import "server-only";

import { z } from "zod";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const sellerRegistrationSchema = z
  .object({
    confirmPassword: z.string(),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Enter a valid email address.")
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be 72 characters or fewer."),
    storeName: z
      .string()
      .trim()
      .min(2, "Store name is required.")
      .max(80, "Store name must be 80 characters or fewer."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SellerRegistrationInput = z.infer<typeof sellerRegistrationSchema>;

export function createStoreId() {
  return `store_${crypto.randomUUID()}`;
}

export function getSellerRegistrationErrorMessage(error: {
  code?: string;
  message?: string;
  status?: number;
}) {
  if (error.code === "email_exists") {
    return "An account with that email already exists.";
  }

  if (typeof error.message === "string") {
    const normalizedMessage = error.message.toLowerCase();

    if (
      normalizedMessage.includes("already been registered") ||
      normalizedMessage.includes("user already registered")
    ) {
      return "An account with that email already exists.";
    }
  }

  if (error.status === 422) {
    return "That seller account could not be created.";
  }

  return "Seller registration is unavailable right now.";
}

export async function registerSeller(input: SellerRegistrationInput) {
  const supabase = createAdminSupabaseClient();
  const storeId = createStoreId();

  const { data, error } = await supabase.auth.admin.createUser({
    app_metadata: {
      role: "manager",
      store_id: storeId,
    },
    email: input.email,
    email_confirm: true,
    password: input.password,
    user_metadata: {
      store_id: storeId,
      store_name: input.storeName,
    },
  });

  if (error) {
    throw new Error(getSellerRegistrationErrorMessage(error));
  }

  if (!data.user) {
    throw new Error("Seller registration is unavailable right now.");
  }

  return {
    email: input.email,
    storeId,
    storeName: input.storeName,
    userId: data.user.id,
  };
}
