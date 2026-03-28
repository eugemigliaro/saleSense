import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import {
  createLeadForProduct,
  listLeadsByStore,
} from "@/lib/leads";

import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/leads", () => ({
  createLeadForProduct: vi.fn(),
  listLeadsByStore: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockCreateLeadForProduct = vi.mocked(createLeadForProduct);
const mockListLeadsByStore = vi.mocked(listLeadsByStore);

describe("/api/v1/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for seller lead listing without auth", async () => {
    mockGetSellerContext.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Seller authentication required.",
      },
    });
    expect(mockListLeadsByStore).not.toHaveBeenCalled();
  });

  it("returns 404 when the lead references a missing product", async () => {
    mockCreateLeadForProduct.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/v1/leads", {
        body: JSON.stringify({
          customerEmail: "prospect@example.com",
          customerName: "Prospect Buyer",
          productId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Product not found.",
      },
    });
  });

  it("normalizes and forwards optional chat session context for lead creation", async () => {
    mockCreateLeadForProduct.mockResolvedValue({
      aiSummary: "Customer wants better battery life.",
      createdAt: "2026-03-28T08:30:00.000Z",
      customerEmail: "prospect@example.com",
      customerName: "Prospect Buyer",
      customerPhone: null,
      id: "44444444-4444-4444-8444-444444444444",
      inferredInterest: "battery life",
      nextBestProduct: null,
      productId: "11111111-1111-4111-8111-111111111111",
      storeId: "store-1",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/leads", {
        body: JSON.stringify({
          chatSessionId: "22222222-2222-4222-8222-222222222222",
          customerEmail: "Prospect@Example.com",
          customerName: " Prospect Buyer ",
          customerPhone: " ",
          productId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(mockCreateLeadForProduct).toHaveBeenCalledWith({
      aiSummary: null,
      chatSessionId: "22222222-2222-4222-8222-222222222222",
      customerEmail: "prospect@example.com",
      customerName: "Prospect Buyer",
      customerPhone: null,
      inferredInterest: null,
      nextBestProduct: null,
      productId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
