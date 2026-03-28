import { describe, expect, it } from "vitest";

import {
  createLeadSchema,
  normalizeCreateLeadInput,
  updateProductSchema,
} from "@/lib/schemas";

const TEST_PRODUCT_ID = "11111111-1111-4111-8111-111111111111";

describe("normalizeCreateLeadInput", () => {
  it("normalizes optional empty strings to null", () => {
    const parsed = createLeadSchema.parse({
      aiSummary: " ",
      customerEmail: " Prospect@Example.com ",
      customerName: " Prospect Buyer ",
      customerPhone: " ",
      inferredInterest: " ",
      nextBestProduct: " Tablet Pro ",
      productId: TEST_PRODUCT_ID,
    });

    expect(normalizeCreateLeadInput(parsed)).toEqual({
      aiSummary: null,
      customerEmail: "prospect@example.com",
      customerName: "Prospect Buyer",
      customerPhone: null,
      inferredInterest: null,
      nextBestProduct: "Tablet Pro",
      productId: TEST_PRODUCT_ID,
    });
  });
});

describe("updateProductSchema", () => {
  it("requires at least one editable field", () => {
    const result = updateProductSchema.safeParse({});

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.issues[0]?.path).toEqual(["body"]);
  });
});
