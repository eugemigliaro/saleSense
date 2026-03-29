import { describe, expect, it } from "vitest";

import {
  createDeviceSessionSchema,
  createLeadSchema,
  normalizeSendChatMessageInput,
  sendChatMessageSchema,
  normalizeCreateLeadInput,
  updateProductSchema,
} from "@/lib/schemas";

const TEST_PRODUCT_ID = "11111111-1111-4111-8111-111111111111";

describe("normalizeCreateLeadInput", () => {
  it("normalizes optional empty strings to null", () => {
    const parsed = createLeadSchema.parse({
      aiSummary: " ",
      chatSessionId: "22222222-2222-4222-8222-222222222222",
      customerEmail: " Prospect@Example.com ",
      customerName: " Prospect Buyer ",
      customerPhone: " ",
      inferredInterest: " ",
      nextBestProduct: " Tablet Pro ",
      productId: TEST_PRODUCT_ID,
    });

    expect(normalizeCreateLeadInput(parsed)).toEqual({
      aiSummary: null,
      chatSessionId: "22222222-2222-4222-8222-222222222222",
      customerEmail: "prospect@example.com",
      customerName: "Prospect Buyer",
      customerPhone: null,
      inferredInterest: null,
      nextBestProduct: "Tablet Pro",
      productId: TEST_PRODUCT_ID,
    });
  });

  it("fills a default customer name when only email is provided", () => {
    const parsed = createLeadSchema.parse({
      customerEmail: " prospect@example.com ",
      productId: TEST_PRODUCT_ID,
    });

    expect(normalizeCreateLeadInput(parsed)).toMatchObject({
      customerEmail: "prospect@example.com",
      customerName: "Store visitor",
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

describe("createDeviceSessionSchema", () => {
  it("requires a valid product id", () => {
    const result = createDeviceSessionSchema.safeParse({
      productId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });
});

describe("normalizeSendChatMessageInput", () => {
  it("returns the normalized message content without requiring client transcript", () => {
    const parsed = sendChatMessageSchema.parse({
      content: "Tell me more about the camera.",
    });

    expect(normalizeSendChatMessageInput(parsed)).toEqual({
      content: "Tell me more about the camera.",
      leadCaptureState: "idle",
    });
  });
});
