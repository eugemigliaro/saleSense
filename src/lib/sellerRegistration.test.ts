import { describe, expect, it } from "vitest";

import {
  createStoreId,
  getSellerRegistrationErrorMessage,
  sellerRegistrationSchema,
} from "@/lib/sellerRegistration";

describe("sellerRegistrationSchema", () => {
  it("normalizes the email field", () => {
    const result = sellerRegistrationSchema.parse({
      confirmPassword: "supersecure123",
      email: " Manager@Example.COM ",
      password: "supersecure123",
      storeName: "Downtown Flagship",
    });

    expect(result.email).toBe("manager@example.com");
  });

  it("rejects mismatched passwords", () => {
    const result = sellerRegistrationSchema.safeParse({
      confirmPassword: "different",
      email: "manager@example.com",
      password: "supersecure123",
      storeName: "Downtown Flagship",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.message).toBe("Passwords do not match.");
  });
});

describe("createStoreId", () => {
  it("generates a unique store-scoped identifier", () => {
    expect(createStoreId()).toMatch(
      /^store_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("getSellerRegistrationErrorMessage", () => {
  it("maps duplicate-email errors to a clear message", () => {
    expect(
      getSellerRegistrationErrorMessage({
        code: "email_exists",
        message: "User already registered",
        status: 422,
      }),
    ).toBe("An account with that email already exists.");
  });
});
